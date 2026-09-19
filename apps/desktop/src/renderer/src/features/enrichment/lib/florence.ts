import type { RawImage } from "@huggingface/transformers";
import { IMAGE_MODEL, onDeviceModelVersion } from "@shared/on-device-models";
import { inferFlorence } from "./inference-client";
import type { FlorenceTask } from "./inference-core";

export function florenceModelVersion(): string {
  return onDeviceModelVersion(IMAGE_MODEL, 2);
}

export function runFlorence(
  image: RawImage,
  task: FlorenceTask,
): Promise<string> {
  return inferFlorence(image, task);
}
