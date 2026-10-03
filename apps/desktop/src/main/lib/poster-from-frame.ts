import { readFile } from "node:fs/promises";
import {
  isEncryptedLibraryMedia,
  withDecryptedLibraryMediaPath,
} from "../core/storage/library-media-storage";
import { extractFirstFrame } from "./ffmpeg-frame";
import { probeImageDims } from "./image-process";
import type { PosterWrite } from "./poster-policy";

export async function buildFirstFramePoster(
  videoPath: string,
  filename: string,
): Promise<PosterWrite | null> {
  if (await isEncryptedLibraryMedia(videoPath).catch(() => false)) {
    return withDecryptedLibraryMediaPath(videoPath, (path) =>
      buildFirstFramePoster(path, filename),
    );
  }
  const frame = await extractFirstFrame(videoPath);
  if (!frame) return null;
  try {
    const bytes = await readFile(frame.path);
    if (bytes.byteLength === 0) return null;
    const dims = await probeImageDims(bytes);
    return {
      kind: "poster",
      filename,
      bytes,
      mimeType: frame.mimeType,
      ...dims,
    };
  } finally {
    await frame.cleanup();
  }
}
