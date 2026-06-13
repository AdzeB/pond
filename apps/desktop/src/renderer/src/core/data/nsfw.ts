import { env, pipeline, RawImage } from "@huggingface/transformers";
import type { Sensitivity } from "@pond/schema/db";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import pLimit from "p-limit";
import { pickPrimaryUnit } from "./media";
import { pool, savesStore, upsertSave } from "./pool";
import { usePrefs } from "./prefs";
import type { Save } from "./types";

// On-device sensitive-media (NSFW) detection.
//
// Classification runs entirely in the renderer via a Vision Transformer
// (AdamCodd/vit-base-nsfw-detector) executed with transformers.js on WebGPU
// (falling back to WASM). transformers.js is dynamically imported the first
// time a save is classified, so users who never trigger the sweep pay nothing.
// The model weights download from the Hugging Face Hub on first use and are
// cached by the browser afterwards (the app is online for sync anyway).
//
// A save's verdict lives on the DB-backed `save.sensitivity` column (a derived
// value, like dominantColors/phash). A throttled background sweep classifies
// every unclassified save so the verdict is available both for blurring and
// for the Sensitivity filter; the result is persisted via a system write that
// syncs across devices and survives restarts.

export type { Sensitivity };

export type SensitivityState = "pending" | "safe" | "sensitive";

// The HF Hub model id. A ViT binary classifier ("sfw" / "nsfw") that's
// markedly more accurate than the legacy MobileNet CNN.
const MODEL_ID = "AdamCodd/vit-base-nsfw-detector";

// Stamp recorded alongside each verdict (save.sensitivityModel). The sweep
// re-classifies any save whose stamp differs, so bumping this re-runs the whole
// library against a new model — saves classified by the old MobileNet CNN have
// no stamp (null) and are picked up automatically.
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

// Per-session reveal state. Revealing a save in the grid keeps it revealed in
// the detail view (and vice versa) until the app restarts.
const revealStore = new Store<{ ids: ReadonlySet<string> }>({
  ids: new Set<string>(),
});

// Lazy, shared classifier handle. The dynamic import keeps transformers.js +
// onnxruntime-web out of the initial bundle; they only load when the first
// save is classified. Prefers WebGPU; falls back to WASM. Always uses the
// quantized (q8) weights — fp16 produces a broken constant output for this ViT
// on WebGPU (every image scores identically), and q8 matches fp32 accuracy at
// ~1/4 the download.
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
// Saves whose image failed to decode/classify this session. We deliberately do
// NOT mark them "safe" (that would hide genuinely sensitive media behind a
// false negative); instead we skip them until the next launch.
const failed = new Set<string>();

// The frame that best represents a save: the primary image, or a video's
// poster. Returns null when there's nothing classifiable yet (e.g. a video
// still ingesting with no poster) so we retry once media lands.
function representativeImageUrl(save: Save): string | null {
  const unit = pickPrimaryUnit(save);
  if (!unit) return null;
  return unit.isVideo ? (unit.posterUrl ?? null) : unit.url;
}

// Fetch a save's image and decode it for the model. A plain `<img crossOrigin>`
// is rejected for custom schemes, so we `fetch` the bytes (the pond:// scheme
// is corsEnabled + sends ACAO) and hand the Blob to transformers.js, which
// resizes to the model's input internally.
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

// Persist a verdict: update the pool immediately (so blur/filter react now)
// then write it through to the DB as a system action (syncs + survives
// restarts). A failed write just leaves the column null to retry later.
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
      // Model couldn't load; bail without persisting so the save stays
      // unclassified and a later sweep retries.
      inflight.delete(id);
      return;
    }
    try {
      const image = await loadImage(url);
      // The model has two labels (sfw/nsfw); top_k must be > 0 — `top_k: 0`
      // returns an empty array in transformers.js, which would read as "safe".
      const out = await classifier(image, { top_k: 2 });
      const predictions = (
        Array.isArray(out[0]) ? out[0] : out
      ) as Prediction[];
      await persistVerdict(id, verdictFromPredictions(predictions));
    } catch (err) {
      // Don't persist on failure — marking "safe" here would falsely un-blur
      // sensitive media. Skip for the session and retry on next launch.
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

// Walk the pool and enqueue every unclassified save. Cheap to re-run: classify
// dedupes by id, completed saves carry a verdict so they're skipped, and
// `pLimit` caps concurrency regardless of how many are enqueued at once.
function scan(): void {
  for (const save of pool.snapshot()) {
    if (isSweepEligible(save)) classify(save);
  }
}

const LEGACY_STORAGE_KEY = "pond.nsfw.verdicts.v1";

// One-time backfill: migrate verdicts cached in the old localStorage map onto
// the DB column for saves that are still unclassified, then drop the key.
function migrateLegacyVerdicts(): void {
  if (typeof window === "undefined") return;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const obj = JSON.parse(raw) as Record<string, number>;
    for (const [id, v] of Object.entries(obj)) {
      const save = pool.get(id);
      if (save && save.sensitivity == null) {
        // Stamp as legacy so the sweep still re-classifies it with the ViT.
        void persistVerdict(id, v === 1 ? "sensitive" : "safe", "legacy");
      }
    }
  } catch {
    // Corrupt payload: nothing to migrate.
  }
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore: removal will retry next launch (migration is idempotent).
  }
}

let sweepStarted = false;
let scanScheduled = false;

function scheduleScan(): void {
  if (scanScheduled) return;
  scanScheduled = true;
  // Coalesce bursts of pool updates (bulk hydration, sync batches) into a
  // single scan and keep it off the synchronous store-update path.
  setTimeout(() => {
    scanScheduled = false;
    scan();
  }, 250);
}

// Begin the background classification sweep. Idempotent; returns an unsubscribe
// for symmetry with the mounting effect (the sweep runs for the app lifetime).
export function startSensitiveSweep(): () => void {
  if (sweepStarted) return () => {};
  sweepStarted = true;
  migrateLegacyVerdicts();
  scheduleScan();
  const sub = savesStore.subscribe(scheduleScan);
  return () => sub.unsubscribe();
}

export function reveal(id: string): void {
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

  // Only blur media the model has confirmed sensitive. Unclassified media
  // renders normally so a slow/failed classifier can't mass-blur the library.
  return {
    blurred: enabled && !revealed && sensitivity === "sensitive",
    sensitivity,
    reveal: () => reveal(save.id),
  };
}
