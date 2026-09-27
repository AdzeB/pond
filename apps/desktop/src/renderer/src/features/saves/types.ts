import type {
  ImageComment,
  ImageCrop,
  ListKind,
  MediaType,
  SaveStatus,
  Source,
  VideoNote,
} from "@pond/schema/db";
import type { RawJson } from "@pond/schema/raw";
import type { WireTask } from "@shared/wire";

export interface SaveFile {
  kind: string;
  path: string;
  sha256: string;
  size: number;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  family?: string | null;
  subfamily?: string | null;
  fontWeight?: number | null;
  bpm?: number | null;
}

export interface Save {
  id: string;
  source: Source;
  sourceId: string;
  accountId?: string | null;
  url: string;
  title: string | null;
  description: string | null;
  author: string | null;
  notes: string | null;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  files: SaveFile[];
  coverIndex?: number;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  container?: string | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  bitrate?: number | null;
  colorSpace?: string | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  lensModel?: string | null;
  focalLength?: number | null;
  aperture?: number | null;
  exposureTime?: string | null;
  iso?: number | null;
  takenAt?: number | null;
  phash?: string | null;
  blurhash?: string | null;
  caption?: string | null;
  captionModel?: string | null;
  ocrText?: string | null;
  ocrModel?: string | null;
  transcript?: string | null;
  transcriptModel?: string | null;
  embeddingModel?: string | null;
  clipEmbedding?: number[] | null;
  clipModel?: string | null;
  aesthetic?: string[] | null;
  aestheticModel?: string | null;
  sensitiveScore?: number | null;
  sensitiveModel?: string | null;
  autoTitleModel?: string | null;
  suggestedTags?: string[] | null;
  suggestedTagsModel?: string | null;
  videoNotes?: VideoNote[];
  comments?: ImageComment[];
  rating?: number | null;
  rotate?: number;
  flipX?: boolean;
  flipY?: boolean;
  crop?: ImageCrop | null;
  dominantColors?: string[];
  primaryColor?: string | null;
  tags: string[];
  folderIds?: string[];
  listKinds?: ListKind[];
  rawJson?: RawJson | null;
  status?: SaveStatus;
  ingestStartedAt?: number | null;
  ingestCompletedAt?: number | null;
  tasks?: WireTask[];
  savedAt: number;
  createdAt: number;
  publishedAt?: number | null;
  deletedAt: number | null;
}
