import type { RawImage } from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/stores/prefs";
import { inferFlorence } from "./inference-client";
import type { FlorenceTask } from "./inference-core";

// Florence-2: one vision-language model serving both captioning and OCR. Model
// loading + execution lives in the inference worker (inference-core); this module
// only resolves the prefs-driven model id and the stamp the sweep keys on.

export type { FlorenceTask };

// onnx-community ships the ONNX weights transformers.js needs; overridable via prefs.
const DEFAULT_MODEL_ID = "onnx-community/Florence-2-base-ft";

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.captionModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function florenceModelVersion(): string {
  return `${modelId()}@1`;
}

// Run one Florence task over an image, returning the decoded text (or "").
export function runFlorence(
  image: RawImage,
  task: FlorenceTask,
): Promise<string> {
  return inferFlorence(image, task, modelId());
}
