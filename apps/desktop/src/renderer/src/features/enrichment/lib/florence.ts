import type { RawImage } from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/features/settings/state/prefs";
import { inferFlorence } from "./inference-client";
import type { FlorenceTask } from "./inference-core";

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

export function runFlorence(
  image: RawImage,
  task: FlorenceTask,
): Promise<string> {
  return inferFlorence(image, task, modelId());
}
