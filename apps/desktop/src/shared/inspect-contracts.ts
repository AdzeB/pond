import type { ImageCrop } from "@pond/schema/db";

export interface MediaTiming {
  frameRate: number | null;
}

export interface InspectQueryInputs {
  "saves.cropAsCopy": {
    id: string;
    fileIndex: number;
    crop: ImageCrop;
    frameIndex?: number;
  };
  "saves.mediaTiming": { id: string; fileIndex: number };
}
export interface InspectQueryResults {
  "saves.cropAsCopy": { ok: true; id: string } | { ok: false; error: string };
  "saves.mediaTiming": MediaTiming;
}
