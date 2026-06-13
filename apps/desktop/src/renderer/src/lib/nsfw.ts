import { env, pipeline, RawImage } from "@huggingface/transformers";
import type { Sensitivity } from "@pond/schema/db";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import pLimit from "p-limit";
import { pool, savesStore, upsertSave } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { pickPrimaryUnit } from "./media";
import type { Save } from "./types";

// On-device NSFW detection: a lazily-loaded ViT classifies saves; verdict persisted to save.sensitivity and a background sweep syncs across devices.

type SensitivityState = "pending" | "safe" | "sensitive";

const MODEL_ID = "AdamCodd/vit-base-nsfw-detector";

// Verdict stamp (save.sensitivityModel); bumping re-classifies the whole library. Legacy MobileNet saves have a null stamp and get picked up.
const SENSITIVITY_MODEL_VERSION = "vit-base-nsfw-detector@2";

// nsfw probability at/above which a save is flagged sensitive.
const SENSITIVE_THRESHOLD = 0.5;

interface Prediction {
  label: string;
  score: number;
}
type ImageClassifier = (
  input: RawImage,
  opts?: { top_k?: number },
) => Promise<Prediction[] | Prediction[][]>;

// Per-session reveal state, shared across grid and detail view until restart.
const revealStore = new Store<{ ids: ReadonlySet<string> }>({
  ids: new Set<string>(),
});

// Lazy shared classifier; dynamic import trims the bundle. Prefers WebGPU. q8 only — fp16 gives broken constant output for this ViT on WebGPU.
let classifierPromise: Promise<ImageClassifier> | null = null;
function getClassifier(): Promise<ImageClassifier> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      env.allowLocalModels = false;
      const tryBuild = async (device: "webgpu" | "wasm") => {
        const pipe = await pipeline("image-classification", MODEL_ID, {
          device,
          dtype: "q8",
        });
        console.info(`[nsfw] ViT classifier ready (${device}/q8)`);
        return pipe as unknown as ImageClassifier;
      };
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        try {
          return await tryBuild("webgpu");
        } catch (err) {
          console.warn("[nsfw] WebGPU unavailable; falling back to WASM", err);
        }
      }
      return tryBuild("wasm");
    })();
    classifierPromise.catch((err) => {
      console.error("[nsfw] failed to load classifier", err);
      // Allow a later retry if the model failed to load (e.g. offline).
      classifierPromise = null;
    });
  }
  return classifierPromise;
}

const limit = pLimit(2);
const inflight = new Set<string>();
// Decode/classify failures: skipped this session rather than marked "safe" (a false negative would hide sensitive media).
const failed = new Set<string>();

// Best frame for a save: primary image or video poster; null until something's classifiable.
function representativeImageUrl(save: Save): string | null {
  const unit = pickPrimaryUnit(save);
  if (!unit) return null;
  return unit.isVideo ? (unit.posterUrl ?? null) : unit.url;
}

// Fetch the bytes (img crossOrigin is rejected for the pond:// scheme) and hand the Blob to transformers.js.
async function loadImage(url: string): Promise<RawImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  return RawImage.fromBlob(await res.blob());
}

function verdictFromPredictions(predictions: Prediction[]): Sensitivity {
  const nsfw =
    predictions.find((p) => p.label.toLowerCase() === "nsfw")?.score ?? 0;
  return nsfw >= SENSITIVE_THRESHOLD ? "sensitive" : "safe";
}

// Update the pool immediately (blur/filter react now), then write through to the DB; a failed write retries later.
async function persistVerdict(
  id: string,
  verdict: Sensitivity,
  model: string = SENSITIVITY_MODEL_VERSION,
): Promise<void> {
  const current = pool.get(id);
  if (
    current &&
    (current.sensitivity !== verdict || current.sensitivityModel !== model)
  ) {
    upsertSave({ ...current, sensitivity: verdict, sensitivityModel: model });
  }
  try {
    await window.pond.query("saves.setSensitivity", {
      id,
      sensitivity: verdict,
      sensitivityModel: model,
    });
  } catch (err) {
    console.warn(`[nsfw] failed to persist verdict for ${id}`, err);
  }
}

function classify(save: Save): void {
  const id = save.id;
  if (inflight.has(id) || failed.has(id)) return;
  const url = representativeImageUrl(save);
  if (!url) return; // nothing to classify yet; stays unclassified
  inflight.add(id);
  void limit(async () => {
    let classifier: ImageClassifier;
    try {
      classifier = await getClassifier();
    } catch {
      // Model didn't load; bail unpersisted so a later sweep retries.
      inflight.delete(id);
      return;
    }
    try {
      const image = await loadImage(url);
      // top_k must be > 0 — top_k:0 returns [] in transformers.js, which reads as "safe".
      const out = await classifier(image, { top_k: 2 });
      const predictions = (
        Array.isArray(out[0]) ? out[0] : out
      ) as Prediction[];
      await persistVerdict(id, verdictFromPredictions(predictions));
    } catch (err) {
      // Don't persist on failure — marking "safe" would falsely un-blur sensitive media.
      failed.add(id);
      console.warn(`[nsfw] classify failed for ${id}`, err);
    } finally {
      inflight.delete(id);
    }
  });
}

function isSweepEligible(save: Save): boolean {
  if (save.status !== "complete" || save.deletedAt != null) return false;
  // Unclassified, or classified by an older model — re-run with the current one.
  return (
    save.sensitivity == null ||
    save.sensitivityModel !== SENSITIVITY_MODEL_VERSION
  );
}

// Enqueue every unclassified save; cheap to re-run (classify dedupes, pLimit caps concurrency).
function scan(): void {
  for (const save of pool.snapshot()) {
    if (isSweepEligible(save)) classify(save);
  }
}

let sweepStarted = false;
let scanScheduled = false;

function scheduleScan(): void {
  if (scanScheduled) return;
  scanScheduled = true;
  // Coalesce bursts of pool updates into one scan, off the store-update path.
  setTimeout(() => {
    scanScheduled = false;
    scan();
  }, 250);
}

// Begin the background sweep. Idempotent; unsubscribe is for symmetry (sweep runs for app lifetime).
export function startSensitiveSweep(): () => void {
  if (sweepStarted) return () => {};
  sweepStarted = true;
  scheduleScan();
  const sub = savesStore.subscribe(scheduleScan);
  return () => sub.unsubscribe();
}

function reveal(id: string): void {
  revealStore.setState((s) => {
    if (s.ids.has(id)) return s;
    const ids = new Set(s.ids);
    ids.add(id);
    return { ids };
  });
}

export interface SensitiveMedia {
  /** True when the media should be rendered blurred right now. */
  blurred: boolean;
  /** Classification state for this save. */
  sensitivity: SensitivityState;
  /** Reveal this save for the rest of the session. */
  reveal: () => void;
}

export function useSensitiveMedia(save: Save): SensitiveMedia {
  const [preferences] = usePrefs("preferences");
  const enabled = preferences?.blurSensitiveMedia === true;

  const revealed = useStore(revealStore, (s) => s.ids.has(save.id));

  const sensitivity: SensitivityState =
    save.sensitivity === "sensitive"
      ? "sensitive"
      : save.sensitivity === "safe"
        ? "safe"
        : "pending";

  // Only blur model-confirmed sensitive media so a slow/failed classifier can't mass-blur.
  return {
    blurred: enabled && !revealed && sensitivity === "sensitive",
    sensitivity,
    reveal: () => reveal(save.id),
  };
}
