import type { RawImage } from "@huggingface/transformers";
import { z } from "zod";
import type { FlorenceTask } from "./inference-core";
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceResult,
  SerializedImage,
} from "./inference-protocol";

/** Main-thread client for the inference Web Worker. In-thread fallback is only for a worker that never started, not one that died mid-run; Whisper in the UI renderer has crashed the process (exit 5). */

function serializeImage(image: RawImage): SerializedImage {
  const copy = new Uint8ClampedArray(image.data);
  return {
    data: copy.buffer,
    width: image.width,
    height: image.height,
    channels: image.channels,
  };
}

interface Pending {
  resolve(value: InferenceResult): void;
  reject(error: Error): void;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type RequestBody = DistributiveOmit<InferenceRequest, "id">;

let worker: Worker | null = null;
let workerBroken = false;
let workerEverStarted = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAllPending(error: Error): void {
  for (const p of pending.values()) p.reject(error);
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
      console.error("[inference] worker crashed", event.message);
      workerBroken = true;
      worker?.terminate();
      worker = null;
      failAllPending(new Error("inference worker crashed"));
    };
    worker = w;
    workerEverStarted = true;
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

const TextSchema = z.string();
const LabelsSchema = z.array(TextSchema);
const ScoresSchema = z.array(z.number());
const VectorSchema = z.instanceof(Float32Array);
const VectorsSchema = z.array(VectorSchema);

function callWorker<T extends InferenceResult>(
  result: z.ZodType<T>,
  msg: RequestBody,
  transfer: Transferable[],
): Promise<T> {
  const w = ensureWorker();
  if (!w) return Promise.reject(new Error("inference worker unavailable"));
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (value) => resolve(result.parse(value)),
      reject,
    });
    const request: InferenceRequest = { id, ...msg };
    w.postMessage(request, transfer);
  });
}

/** A model-level rejection while the worker is healthy propagates as-is. A worker that died mid-run must not resume on the UI thread. */
async function viaWorker<T>(
  run: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  if (workerBroken) {
    if (workerEverStarted) throw new Error("inference worker crashed");
    return fallback();
  }
  try {
    return await run();
  } catch (err) {
    if (workerBroken && workerEverStarted) throw err;
    if (workerBroken) return fallback();
    throw err;
  }
}

export function inferFlorence(
  image: RawImage,
  task: FlorenceTask,
): Promise<string> {
  return viaWorker(
    () => {
      const img = serializeImage(image);
      return callWorker(TextSchema, { op: "florence", image: img, task }, [
        img.data,
      ]);
    },
    async () => (await import("./inference-core")).coreFlorence(image, task),
  );
}

export function inferClipImage(image: RawImage): Promise<Float32Array> {
  return viaWorker(
    () => {
      const img = serializeImage(image);
      return callWorker(VectorSchema, { op: "clipImage", image: img }, [
        img.data,
      ]);
    },
    async () => (await import("./inference-core")).coreClipImage(image),
  );
}

export function inferClipAesthetic(
  image: RawImage,
  labels: string[],
): Promise<string[]> {
  return viaWorker(
    () => {
      const img = serializeImage(image);
      return callWorker(
        LabelsSchema,
        { op: "clipAesthetic", image: img, labels },
        [img.data],
      );
    },
    async () =>
      (await import("./inference-core")).coreClipAesthetic(image, labels),
  );
}

export function inferSensitiveContent(images: RawImage[]): Promise<number[]> {
  return viaWorker(
    () => {
      const serialized = images.map(serializeImage);
      return callWorker(
        ScoresSchema,
        { op: "sensitiveContent", images: serialized },
        serialized.map((image) => image.data),
      );
    },
    async () => (await import("./inference-core")).coreSensitiveContent(images),
  );
}

export function inferEmbedText(text: string): Promise<Float32Array> {
  return viaWorker(
    () => callWorker(VectorSchema, { op: "embedText", text }, []),
    async () => (await import("./inference-core")).coreEmbedText(text),
  );
}

export function inferEmbedTexts(texts: string[]): Promise<Float32Array[]> {
  return viaWorker(
    () => callWorker(VectorsSchema, { op: "embedTexts", texts }, []),
    async () => (await import("./inference-core")).coreEmbedTexts(texts),
  );
}

export function inferTranscribe(audio: Float32Array): Promise<string> {
  return viaWorker(
    () => {
      const copy = audio.slice();
      return callWorker(TextSchema, { op: "transcribe", audio: copy }, [
        copy.buffer,
      ]);
    },
    async () => {
      throw new Error("whisper requires the inference worker");
    },
  );
}
