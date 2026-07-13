import type { RawImage } from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/stores/prefs";
import { inferFlorence } from "./inference-client";
import type { FlorenceTask } from "./inference-core";

/** Florence-2 serves both captioning and OCR; model loading + execution live in the inference worker, and this module resolves the prefs-driven model id and the stamp the sweep keys on. */

/** onnx-community ships the ONNX weights transformers.js needs. */
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

/** Returns the decoded text, or "" when decoding produces nothing. */
export function runFlorence(
  image: RawImage,
  task: FlorenceTask,
): Promise<string> {
  return inferFlorence(image, task, modelId());
}
