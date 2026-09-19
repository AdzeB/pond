import {
  onDeviceModelVersion,
  TEXT_EMBEDDING_MODEL,
  VISUAL_MODEL,
} from "./on-device-models";

export function textEmbeddingVersion(): string {
  return onDeviceModelVersion(TEXT_EMBEDDING_MODEL, 3);
}

export function clipEmbeddingVersion(): string {
  return onDeviceModelVersion(VISUAL_MODEL, 2);
}
