export interface OnDeviceModel {
  id: string;
  revision: string;
}

export const EMBEDDING_MODEL = {
  id: "onnx-community/embeddinggemma-2-ONNX",
  revision: "daa72c51243991dfcaf9f9137d2c573d8f7790c0",
} as const satisfies OnDeviceModel;

export const IMAGE_MODEL = {
  id: "onnx-community/Florence-2-base-ft",
  revision: "e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f",
} as const satisfies OnDeviceModel;

export const TRANSCRIPTION_MODEL = {
  id: "onnx-community/whisper-base",
  revision: "1846881b6b3a3024392c1eea3ad983695bc23925",
} as const satisfies OnDeviceModel;

export function onDeviceModelVersion(
  model: OnDeviceModel,
  preprocessingVersion: number,
): string {
  return `${model.id}@${model.revision}:${preprocessingVersion}`;
}
