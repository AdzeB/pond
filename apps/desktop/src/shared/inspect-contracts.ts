import type { ImageCrop } from "@pond/schema/db";

export interface MediaTiming {
  frameRate: number | null;
}

export interface InspectQueryInputs {
  "preview.neighbor": { id: string; delta: -1 | 1 };
  "saves.cropAsCopy": {
    id: string;
    fileIndex: number;
    crop: ImageCrop;
    frameIndex?: number;
  };
  "saves.mediaTiming": { id: string; fileIndex: number };
  "preview.configure": {
    pinned?: boolean;
    opacity?: number;
    fit?: { width: number; height: number };
  };
}
export interface InspectQueryResults {
  "preview.neighbor": { id: string | null };
  "saves.cropAsCopy": { ok: true; id: string } | { ok: false; error: string };
  "saves.mediaTiming": MediaTiming;
  "preview.configure": { ok: boolean; pinned: boolean; opacity: number };
}
