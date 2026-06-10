import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { NSFWJS, PredictionType } from "nsfwjs";
import pLimit from "p-limit";
import { useEffect } from "react";
import { pickPrimaryUnit } from "./media";
import { usePrefs } from "./prefs";
import type { Save } from "./types";

// On-device sensitive-media (NSFW) detection.
//
// Classification runs entirely in the renderer via TensorFlow.js + nsfwjs
// (the model ships inside the npm package, so it works offline). Both
// libraries are dynamically imported the first time a classification is
// requested, so users who never enable the blur setting pay nothing.
//
// A save's verdict is computed once and cached in localStorage, keyed by id,
// so each image is only ever classified a single time across launches.
//
// Only media the model confirms as sensitive is blurred. Unclassified media
// renders normally (the trade-off: a sensitive item may show briefly before
// its verdict lands), so a slow or broken classifier never mass-blurs the
// library. The model load state is tracked purely for diagnostics.

export type Sensitivity = "pending" | "safe" | "sensitive";

type Verdict = 0 | 1; // 0 = safe, 1 = sensitive

const STORAGE_KEY = "pond.nsfw.verdicts.v1";

function loadPersisted(): Map<string, Verdict> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, number>;
    const map = new Map<string, Verdict>();
    for (const [id, v] of Object.entries(obj)) {
      map.set(id, v === 1 ? 1 : 0);
    }
    return map;
  } catch {
    return new Map();
  }
}

const verdictStore = new Store<{ map: ReadonlyMap<string, Verdict> }>({
  map: loadPersisted(),
});

// Per-session reveal state. Revealing a save in the grid keeps it revealed in
// the detail view (and vice versa) until the app restarts.
const revealStore = new Store<{ ids: ReadonlySet<string> }>({
  ids: new Set<string>(),
});

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(): void {
  if (typeof window === "undefined") return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const obj: Record<string, Verdict> = {};
      for (const [id, v] of verdictStore.state.map) obj[id] = v;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage denied or over quota: keep the in-memory cache and retry on
      // the next verdict. Worst case we reclassify next launch.
    }
  }, 500);
}

function setVerdict(id: string, verdict: Verdict): void {
  verdictStore.setState((s) => {
    if (s.map.get(id) === verdict) return s;
    const map = new Map(s.map);
    map.set(id, verdict);
    return { map };
  });
  schedulePersist();
}

// Lazy, shared model handle. Dynamic import keeps tfjs + nsfwjs out of the
// initial bundle; they only download when the first save is classified.
let modelPromise: Promise<NSFWJS> | null = null;
function getModel(): Promise<NSFWJS> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, nsfwjs] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("nsfwjs"),
      ]);
      await tf.ready();
      const model = await nsfwjs.load();
      console.info(
        `[nsfw] sensitive-media model ready (tfjs backend: ${tf.getBackend()})`,
      );
      return model;
    })();
    modelPromise.catch((err) => {
      console.error("[nsfw] failed to load sensitive-media model", err);
    });
  }
  return modelPromise;
}

const limit = pLimit(2);
const inflight = new Set<string>();

// The frame that best represents a save: the primary image, or a video's
// poster. Returns null when there's nothing classifiable yet (e.g. a video
// still ingesting with no poster) so we retry once media lands.
function representativeImageUrl(save: Save): string | null {
  const unit = pickPrimaryUnit(save);
  if (!unit) return null;
  return unit.isVideo ? (unit.posterUrl ?? null) : unit.url;
}

// Longest-side cap for the canvas handed to the model. nsfwjs resizes to its
// own input internally, so a smaller source just saves memory/time.
const MAX_CLASSIFY_DIM = 1024;

// Decode a save's image into an origin-clean canvas the model can read.
//
// A plain `<img crossOrigin>` is rejected here: Chromium refuses CORS for
// custom schemes regardless of response headers. Instead we `fetch` the bytes
// (the pond:// scheme is corsEnabled + sends ACAO) and decode through a
// Blob → ImageBitmap, which produces a canvas that is NOT tainted, so
// `tf.browser.fromPixels` can read its pixels.
async function loadClassifiable(url: string): Promise<HTMLCanvasElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  const bitmap = await createImageBitmap(await res.blob());
  try {
    const scale = Math.min(
      1,
      MAX_CLASSIFY_DIM / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function verdictFromPredictions(predictions: PredictionType[]): Verdict {
  const score = (name: PredictionType["className"]) =>
    predictions.find((p) => p.className === name)?.probability ?? 0;
  const explicit = score("Porn") + score("Hentai");
  const sexy = score("Sexy");
  return explicit >= 0.5 || sexy >= 0.8 ? 1 : 0;
}

function classify(save: Save): void {
  const id = save.id;
  if (verdictStore.state.map.has(id) || inflight.has(id)) return;
  const url = representativeImageUrl(save);
  if (!url) return; // nothing to classify yet; stays pending (blurred)
  inflight.add(id);
  void limit(async () => {
    let model: NSFWJS;
    try {
      model = await getModel();
    } catch {
      // Model couldn't load. `getModel` flips the shared state to "error",
      // which makes the hook fail open (stop blurring unclassified media), so
      // there's nothing to do here but bail.
      inflight.delete(id);
      return;
    }
    try {
      const canvas = await loadClassifiable(url);
      setVerdict(id, verdictFromPredictions(await model.classify(canvas)));
    } catch {
      // A single image failed to decode/classify: treat as safe so it isn't
      // blurred forever for an unrelated reason.
      setVerdict(id, 0);
    } finally {
      inflight.delete(id);
    }
  });
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
  sensitivity: Sensitivity;
  /** Reveal this save for the rest of the session. */
  reveal: () => void;
}

export function useSensitiveMedia(save: Save): SensitiveMedia {
  const [preferences] = usePrefs("preferences");
  const enabled = preferences?.blurSensitiveMedia === true;

  const verdict = useStore(verdictStore, (s) => s.map.get(save.id));
  const revealed = useStore(revealStore, (s) => s.ids.has(save.id));

  useEffect(() => {
    // `save` is a fresh object whenever its row updates (the data pool
    // replaces it immutably), so this re-attempts when media lands for a
    // still-ingesting save. `classify` dedupes by id, so re-runs are cheap.
    if (enabled) classify(save);
  }, [enabled, save]);

  const sensitivity: Sensitivity = !enabled
    ? "safe"
    : verdict === 1
      ? "sensitive"
      : verdict === 0
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
