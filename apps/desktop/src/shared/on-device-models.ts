export interface OnDeviceModel {
  id: string;
  revision: string;
}

export const TEXT_EMBEDDING_MODEL = {
  id: "Xenova/all-mpnet-base-v2",
  revision: "e086c5e0b3a57b0ce46dd6d9c0662948860b35f3",
} as const satisfies OnDeviceModel;

export const IMAGE_MODEL = {
  id: "onnx-community/Florence-2-base-ft",
  revision: "e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f",
} as const satisfies OnDeviceModel;

export const VISUAL_MODEL = {
  id: "onnx-community/siglip2-base-patch16-224-ONNX",
  revision: "ba1f3b0843f24bc5417d38e19c37b287d719b2f4",
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
