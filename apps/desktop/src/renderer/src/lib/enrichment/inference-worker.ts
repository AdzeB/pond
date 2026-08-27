/// <reference lib="webworker" />
import { RawImage } from "@huggingface/transformers";
import {
  coreClipAesthetic,
  coreClipImage,
  coreEmbedText,
  coreEmbedTexts,
  coreFlorence,
  coreTranscribe,
} from "./inference-core";
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceResult,
  SerializedImage,
} from "./inference-protocol";

/** Only ever loaded through `new Worker()` (see inference-client); the project's DOM lib would otherwise type `self` as a Window. */
declare const self: DedicatedWorkerGlobalScope;

function toRawImage(s: SerializedImage): RawImage {
  return new RawImage(
    new Uint8ClampedArray(s.data),
    s.width,
    s.height,
    s.channels,
  );
}

async function handle(
  req: InferenceRequest,
): Promise<{ result: InferenceResult; transfer: Transferable[] }> {
  switch (req.op) {
    case "florence":
      return {
        result: await coreFlorence(
          toRawImage(req.image),
          req.task,
          req.modelId,
        ),
        transfer: [],
      };
    case "clipImage": {
      const vec = await coreClipImage(toRawImage(req.image), req.modelId);
      return { result: vec, transfer: [vec.buffer] };
    }
    case "clipAesthetic":
      return {
        result: await coreClipAesthetic(
          toRawImage(req.image),
          req.labels,
          req.modelId,
        ),
        transfer: [],
      };
    case "embedText": {
      const vec = await coreEmbedText(req.text, req.modelId);
      return { result: vec, transfer: [vec.buffer] };
    }
    case "embedTexts": {
      const vecs = await coreEmbedTexts(req.texts, req.modelId);
      return { result: vecs, transfer: vecs.map((v) => v.buffer) };
    }
    case "transcribe":
      return {
        result: await coreTranscribe(req.audio, req.modelId),
        transfer: [],
      };
  }
}

self.onmessage = (event: MessageEvent<InferenceRequest>) => {
  const req = event.data;
  void (async () => {
    try {
      const { result, transfer } = await handle(req);
      const response: InferenceResponse = { id: req.id, ok: true, result };
      self.postMessage(response, transfer);
    } catch (err) {
      const response: InferenceResponse = {
        id: req.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  })();
};
