import type { FlorenceTask } from "./inference-core";

// Wire protocol shared by the inference Web Worker and its main-thread client.
// Images cross the boundary as raw pixel buffers (transferred, not copied);
// audio crosses as a transferred Float32Array. Model ids are resolved from prefs
// on the main thread and passed in, so the worker stays prefs-free.

export interface SerializedImage {
  data: ArrayBuffer;
  width: number;
  height: number;
  channels: number;
}

export type InferenceRequest =
  | {
      id: number;
      op: "florence";
      image: SerializedImage;
      task: FlorenceTask;
      modelId: string;
    }
  | { id: number; op: "clipImage"; image: SerializedImage; modelId: string }
  | {
      id: number;
      op: "clipAesthetic";
      image: SerializedImage;
      labels: string[];
      modelId: string;
    }
  | { id: number; op: "embedText"; text: string; modelId: string }
  | { id: number; op: "embedTexts"; texts: string[]; modelId: string }
  | { id: number; op: "transcribe"; audio: Float32Array; modelId: string };

export type InferenceResult = string | Float32Array | Float32Array[] | string[];

export type InferenceResponse =
  | { id: number; ok: true; result: InferenceResult }
  | { id: number; ok: false; error: string };
