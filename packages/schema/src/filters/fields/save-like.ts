import type { RawJson } from "../../raw";

export interface SaveLike {
  id: string;
  source: string | null;
  url: string;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  tags?: string[];
  notes?: string | null;
  mediaType?: string | null;
  files?: ReadonlyArray<unknown> | null;
  sensitivity?: "safe" | "sensitive" | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  dominantColors?: string[];
  rawJson?: RawJson | null;
  savedAt?: string | Date | number | null;
  createdAt?: string | Date | number | null;
  publishedAt?: string | Date | number | null;
}
