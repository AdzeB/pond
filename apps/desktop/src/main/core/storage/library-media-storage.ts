import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  copyFile,
  mkdir,
  open,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import {
  readFileContainerMetadata,
  readFileContainerRange,
} from "../legacy-encryption/chunked-file-container";
import {
  activeLibraryContains,
  deriveLibrarySubkey,
} from "../legacy-encryption/library-key-runtime";

const FILE_CONTAINER_MAGIC = Buffer.from("PONDFILE", "ascii");
const EXTERNAL_MEDIA_TTL_MS = 60 * 60_000;

export interface LibraryMediaMetadata {
  encrypted: boolean;
  originalSize: number;
}

export async function writeLibraryMedia(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  await writeFile(path, bytes);
}

export async function copyLibraryMediaFile(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await copyFile(inputPath, outputPath);
}

export async function libraryMediaMetadata(
  path: string,
): Promise<LibraryMediaMetadata> {
  if (!(await isEncryptedLibraryMedia(path))) {
    return { encrypted: false, originalSize: (await stat(path)).size };
  }
  if (!activeLibraryContains(path)) {
    throw new Error("Encrypted media is outside the unlocked Library.");
  }
  const key = deriveLibrarySubkey("media:v1");
  try {
    const metadata = await readFileContainerMetadata({ path, key });
    return { encrypted: true, originalSize: metadata.originalSize };
  } finally {
    key.fill(0);
  }
}

export async function* readLibraryMediaRange(input: {
  path: string;
  start: number;
  endExclusive: number;
}): AsyncGenerator<Buffer> {
  if (!(await isEncryptedLibraryMedia(input.path))) {
    if (input.start === input.endExclusive) return;
    const stream = createReadStream(input.path, {
      start: input.start,
      end: input.endExclusive - 1,
    });
    for await (const chunk of stream) {
      yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }
    return;
  }
  if (!activeLibraryContains(input.path)) {
    throw new Error("Encrypted media is outside the unlocked Library.");
  }
  const key = deriveLibrarySubkey("media:v1");
  try {
    yield* readFileContainerRange({ ...input, key });
  } finally {
    key.fill(0);
  }
}

export async function readLibraryMedia(path: string): Promise<Buffer> {
  const { originalSize } = await libraryMediaMetadata(path);
  const chunks: Buffer[] = [];
  for await (const chunk of readLibraryMediaRange({
    path,
    start: 0,
    endExclusive: originalSize,
  })) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, originalSize);
}

export async function exportLibraryMedia(
  sourcePath: string,
  outputPath: string,
): Promise<void> {
  const { originalSize } = await libraryMediaMetadata(sourcePath);
  const destination = await open(outputPath, "wx", 0o600);
  let offset = 0;
  try {
    for await (const chunk of readLibraryMediaRange({
      path: sourcePath,
      start: 0,
      endExclusive: originalSize,
    })) {
      let written = 0;
      while (written < chunk.byteLength) {
        const result = await destination.write(
          chunk,
          written,
          chunk.byteLength - written,
          offset + written,
        );
        if (result.bytesWritten <= 0) {
          throw new Error("Could not write exported media.");
        }
        written += result.bytesWritten;
      }
      offset += chunk.byteLength;
      chunk.fill(0);
    }
    await destination.sync();
  } catch (error) {
    await destination.close();
    await rm(outputPath, { force: true });
    throw error;
  } finally {
    if ((await destination.stat().catch(() => null)) !== null) {
      await destination.close();
    }
  }
}

export async function withDecryptedLibraryMediaPath<T>(
  sourcePath: string,
  operation: (path: string) => Promise<T>,
): Promise<T> {
  if (!(await isEncryptedLibraryMedia(sourcePath))) {
    return operation(sourcePath);
  }
  const temporary = join(
    tmpdir(),
    `pond-media-${randomUUID()}${extname(sourcePath)}`,
  );
  try {
    await exportLibraryMedia(sourcePath, temporary);
    return await operation(temporary);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function materializeLibraryMediaForExternalUse(
  sourcePath: string,
): Promise<string> {
  if (!(await isEncryptedLibraryMedia(sourcePath))) return sourcePath;
  const directory = join(tmpdir(), "pond-external-media");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, `${randomUUID()}${extname(sourcePath)}`);
  await exportLibraryMedia(sourcePath, temporary);
  await chmod(temporary, 0o600);
  const timer = setTimeout(() => {
    void rm(temporary, { force: true });
  }, EXTERNAL_MEDIA_TTL_MS);
  timer.unref();
  return temporary;
}

export async function isEncryptedLibraryMedia(path: string): Promise<boolean> {
  const handle = await open(path, "r");
  try {
    const header = Buffer.alloc(FILE_CONTAINER_MAGIC.byteLength);
    const { bytesRead } = await handle.read(header, 0, header.byteLength, 0);
    return (
      bytesRead === FILE_CONTAINER_MAGIC.byteLength &&
      header.equals(FILE_CONTAINER_MAGIC)
    );
  } finally {
    await handle.close();
  }
}
