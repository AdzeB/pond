import type { ListKind } from "../../list-kinds";
import type { RawJson } from "../../raw";

export interface SaveLike {
  id: string;
  source: string | null;
  accountId?: string | null;
  url: string;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  tags?: string[];
  folderIds?: string[];
  listKinds?: ListKind[];
  notes?: string | null;
  caption?: string | null;
  ocrText?: string | null;
  transcript?: string | null;
  mediaType?: string | null;
  files?: ReadonlyArray<unknown> | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  dominantColors?: string[];
  rawJson?: RawJson | null;
  savedAt?: string | Date | number | null;
  createdAt?: string | Date | number | null;
  publishedAt?: string | Date | number | null;
  rating?: number | null;
  comments?: ReadonlyArray<{ text?: string | null }> | null;
  videoNotes?: ReadonlyArray<{ text?: string | null }> | null;
}
