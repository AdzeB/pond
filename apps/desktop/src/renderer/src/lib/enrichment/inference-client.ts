import type { RawImage } from "@huggingface/transformers";
import type { FlorenceTask } from "./inference-core";
import type {
  InferenceRequest,
  InferenceResponse,
  SerializedImage,
} from "./inference-protocol";

// Main-thread client for the inference Web Worker. Every on-device model call
// goes through here: it serializes inputs, ships them to the worker, and resolves
// the typed result. If the worker can't start (or crashes), it transparently
// falls back to running the same models in-thread via inference-core — so the
// app degrades to the old behavior rather than losing on-device AI entirely.

function serializeImage(image: RawImage): SerializedImage {
  // Copy into a fresh buffer we can transfer, leaving the caller's RawImage
  // intact (so the in-thread fallback can still use it if the worker rejects).
  const src = image.data as Uint8ClampedArray;
  const copy = src.slice();
  return {
    data: copy.buffer,
    width: image.width,
    height: image.height,
    channels: image.channels,
  };
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

// Distribute Omit across the request union so each variant keeps its own fields
// (a plain `Omit<Union, "id">` collapses to just the shared keys).
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type RequestBody = DistributiveOmit<InferenceRequest, "id">;

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAllPending(reason: unknown): void {
  for (const p of pending.values()) p.reject(reason);
  pending.clear();
}

function ensureWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL("./inference-worker.ts", import.meta.url), {
      type: "module",
    });
    w.onmessage = (event: MessageEvent<InferenceResponse>) => {
      const msg = event.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new Error(msg.error));
    };
    w.onerror = (event) => {
      console.error(
        "[inference] worker crashed; falling back to in-thread inference",
        event.message,
      );
      workerBroken = true;
      worker?.terminate();
      worker = null;
      // Reject in-flight calls; the worker-broken flag routes retries in-thread.
      failAllPending(new Error("inference worker crashed"));
    };
    worker = w;
    return w;
  } catch (err) {
    console.error(
      "[inference] failed to start worker; using in-thread inference",
      err,
    );
    workerBroken = true;
    return null;
  }
}

function callWorker<T>(msg: RequestBody, transfer: Transferable[]): Promise<T> {
  const w = ensureWorker();
  if (!w) return Promise.reject(new Error("inference worker unavailable"));
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ id, ...msg } as InferenceRequest, transfer);
  });
}

// Run via the worker; if the worker is (or becomes) broken, run in-thread.
// A model-level rejection while the worker is healthy propagates as-is, so the
// caller keeps the existing "mark failed, retry next session" semantics.
async function viaWorker<T>(
  run: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  if (workerBroken) return fallback();
  try {
    return await run();
  } catch (err) {
    if (workerBroken) return fallback();
    throw err;
  }
}

export function inferFlorence(
  image: RawImage,
  task: FlorenceTask,
  modelId: string,
): Promise<string> {
  return viaWorker(
    () => {
      const img = serializeImage(image);
      return callWorker<string>({ op: "florence", image: img, task, modelId }, [
        img.data,
      ]);
    },
    async () =>
      (await import("./inference-core")).coreFlorence(image, task, modelId),
  );
}

export function inferClipImage(
  image: RawImage,
  modelId: string,
): Promise<Float32Array> {
  return viaWorker(
    () => {
      const img = serializeImage(image);
      return callWorker<Float32Array>(
        { op: "clipImage", image: img, modelId },
        [img.data],
      );
    },
    async () =>
      (await import("./inference-core")).coreClipImage(image, modelId),
  );
}

export function inferClipAesthetic(
  image: RawImage,
  labels: string[],
  modelId: string,
): Promise<string[]> {
  return viaWorker(
    () => {
      const img = serializeImage(image);
      return callWorker<string[]>(
        { op: "clipAesthetic", image: img, labels, modelId },
        [img.data],
      );
    },
    async () =>
      (await import("./inference-core")).coreClipAesthetic(
        image,
        labels,
        modelId,
      ),
  );
}

export function inferEmbedText(
  text: string,
  modelId: string,
): Promise<Float32Array> {
  return viaWorker(
    () => callWorker<Float32Array>({ op: "embedText", text, modelId }, []),
    async () => (await import("./inference-core")).coreEmbedText(text, modelId),
  );
}

export function inferEmbedTexts(
  texts: string[],
  modelId: string,
): Promise<Float32Array[]> {
  return viaWorker(
    () => callWorker<Float32Array[]>({ op: "embedTexts", texts, modelId }, []),
    async () =>
      (await import("./inference-core")).coreEmbedTexts(texts, modelId),
  );
}

export function inferTranscribe(
  audio: Float32Array,
  modelId: string,
): Promise<string> {
  return viaWorker(
    () => {
      // Transfer a copy so the caller's buffer survives for the fallback path.
      const copy = audio.slice();
      return callWorker<string>({ op: "transcribe", audio: copy, modelId }, [
        copy.buffer,
      ]);
    },
    async () =>
      (await import("./inference-core")).coreTranscribe(audio, modelId),
  );
}
