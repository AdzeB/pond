import { createDecipheriv } from "node:crypto";
import { type FileHandle, open, rm } from "node:fs/promises";

const ALGORITHM = "aes-256-gcm";
const MAGIC = Buffer.from("PONDFILE", "ascii");
const VERSION = 1;
const ALGORITHM_ID = 1;
const FLAGS = 0;
const NONCE_PREFIX_BYTES = 8;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BODY_BYTES = 40;
const HEADER_BYTES = HEADER_BODY_BYTES + TAG_BYTES;
const HEADER_NONCE_INDEX = 0xffff_ffff;
const MIN_CHUNK_SIZE = 1;
const MAX_CHUNK_SIZE = 16 * 1024 * 1024;

const FILE_CONTAINER_KEY_BYTES = 32;

export type FileContainerErrorCode =
  | "AUTHENTICATION_FAILED"
  | "INVALID_FORMAT"
  | "INVALID_KEY"
  | "INVALID_RANGE";

class FileContainerError extends Error {
  readonly code: FileContainerErrorCode;

  constructor(code: FileContainerErrorCode, message: string) {
    super(message);
    this.name = "FileContainerError";
    this.code = code;
  }
}

export interface FileContainerMetadata {
  version: number;
  originalSize: number;
  chunkSize: number;
  chunkCount: number;
}

export interface DecryptFileContainerInput {
  inputPath: string;
  outputPath: string;
  key: Uint8Array;
}

export interface ReadFileContainerInput {
  path: string;
  key: Uint8Array;
}

export interface ReadFileContainerRangeInput extends ReadFileContainerInput {
  start: number;
  endExclusive: number;
}

interface ParsedHeader {
  metadata: FileContainerMetadata;
  body: Buffer;
  noncePrefix: Buffer;
}

interface OpenContainer extends ParsedHeader {
  handle: FileHandle;
}

function validateKey(key: Uint8Array): void {
  if (key.byteLength !== FILE_CONTAINER_KEY_BYTES) {
    throw new FileContainerError(
      "INVALID_KEY",
      `File container keys must contain ${FILE_CONTAINER_KEY_BYTES} bytes.`,
    );
  }
}

function validateChunkSize(chunkSize: number): void {
  if (
    !Number.isSafeInteger(chunkSize) ||
    chunkSize < MIN_CHUNK_SIZE ||
    chunkSize > MAX_CHUNK_SIZE
  ) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      `Chunk size must be an integer from ${MIN_CHUNK_SIZE} to ${MAX_CHUNK_SIZE} bytes.`,
    );
  }
}

function chunkCountFor(originalSize: number, chunkSize: number): number {
  if (originalSize === 0) return 0;
  return Math.ceil(originalSize / chunkSize);
}

function nonceFor(noncePrefix: Buffer, index: number): Buffer {
  const nonce = Buffer.alloc(NONCE_BYTES);
  noncePrefix.copy(nonce, 0);
  nonce.writeUInt32BE(index, NONCE_PREFIX_BYTES);
  return nonce;
}

function chunkLength(metadata: FileContainerMetadata, index: number): number {
  if (index < metadata.chunkCount - 1) return metadata.chunkSize;
  return metadata.originalSize - index * metadata.chunkSize;
}

function chunkAdditionalData(
  headerBody: Buffer,
  index: number,
  length: number,
): Buffer {
  const additionalData = Buffer.alloc(HEADER_BODY_BYTES + 8);
  headerBody.copy(additionalData);
  additionalData.writeUInt32BE(index, HEADER_BODY_BYTES);
  additionalData.writeUInt32BE(length, HEADER_BODY_BYTES + 4);
  return additionalData;
}

function parseHeader(bytes: Buffer, key: Uint8Array): ParsedHeader {
  const body = bytes.subarray(0, HEADER_BODY_BYTES);
  if (!body.subarray(0, MAGIC.byteLength).equals(MAGIC)) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container magic is invalid.",
    );
  }
  if (body.readUInt16BE(8) !== VERSION) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container version is unsupported.",
    );
  }
  if (
    body.readUInt16BE(10) !== HEADER_BYTES ||
    body.readUInt8(12) !== ALGORITHM_ID ||
    body.readUInt8(13) !== NONCE_BYTES ||
    body.readUInt8(14) !== TAG_BYTES
  ) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container header is malformed.",
    );
  }

  const noncePrefix = Buffer.from(body.subarray(32, HEADER_BODY_BYTES));
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      nonceFor(noncePrefix, HEADER_NONCE_INDEX),
      { authTagLength: TAG_BYTES },
    );
    decipher.setAAD(body);
    decipher.setAuthTag(bytes.subarray(HEADER_BODY_BYTES, HEADER_BYTES));
    decipher.final();
  } catch {
    throw new FileContainerError(
      "AUTHENTICATION_FAILED",
      "File container header authentication failed.",
    );
  }

  if (body.readUInt8(15) !== FLAGS) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container flags are unsupported.",
    );
  }

  const chunkSize = body.readUInt32BE(16);
  validateChunkSize(chunkSize);
  const storedSize = body.readBigUInt64BE(20);
  if (storedSize > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container size exceeds the supported limit.",
    );
  }
  const originalSize = Number(storedSize);
  const chunkCount = body.readUInt32BE(28);
  if (chunkCount !== chunkCountFor(originalSize, chunkSize)) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container chunk count is malformed.",
    );
  }

  return {
    body: Buffer.from(body),
    noncePrefix,
    metadata: { version: VERSION, originalSize, chunkSize, chunkCount },
  };
}

function expectedContainerSize(metadata: FileContainerMetadata): number {
  const size =
    HEADER_BYTES + metadata.originalSize + metadata.chunkCount * TAG_BYTES;
  if (!Number.isSafeInteger(size)) {
    throw new FileContainerError(
      "INVALID_FORMAT",
      "File container size exceeds the supported limit.",
    );
  }
  return size;
}

async function readExactly(
  handle: FileHandle,
  buffer: Buffer,
  position: number,
): Promise<void> {
  let offset = 0;
  while (offset < buffer.byteLength) {
    const result = await handle.read(
      buffer,
      offset,
      buffer.byteLength - offset,
      position + offset,
    );
    if (result.bytesRead === 0) {
      throw new FileContainerError(
        "INVALID_FORMAT",
        "File container is truncated.",
      );
    }
    offset += result.bytesRead;
  }
}

async function writeExactly(
  handle: FileHandle,
  buffer: Buffer,
  position: number,
): Promise<void> {
  let offset = 0;
  while (offset < buffer.byteLength) {
    const result = await handle.write(
      buffer,
      offset,
      buffer.byteLength - offset,
      position + offset,
    );
    if (result.bytesWritten === 0) {
      throw new Error("Could not write the file container.");
    }
    offset += result.bytesWritten;
  }
}

async function openAuthenticatedContainer(
  path: string,
  key: Uint8Array,
): Promise<OpenContainer> {
  validateKey(key);
  const handle = await open(path, "r");
  try {
    const headerBytes = Buffer.alloc(HEADER_BYTES);
    await readExactly(handle, headerBytes, 0);
    const header = parseHeader(headerBytes, key);
    const stats = await handle.stat();
    if (
      !stats.isFile() ||
      stats.size !== expectedContainerSize(header.metadata)
    ) {
      throw new FileContainerError(
        "INVALID_FORMAT",
        "File container length is malformed.",
      );
    }
    return { handle, ...header };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function readDecryptedChunk(
  container: OpenContainer,
  index: number,
  key: Uint8Array,
): Promise<Buffer> {
  const length = chunkLength(container.metadata, index);
  const encrypted = Buffer.alloc(length + TAG_BYTES);
  const position =
    HEADER_BYTES + index * (container.metadata.chunkSize + TAG_BYTES);
  await readExactly(container.handle, encrypted, position);

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      nonceFor(container.noncePrefix, index),
      { authTagLength: TAG_BYTES },
    );
    decipher.setAAD(chunkAdditionalData(container.body, index, length));
    decipher.setAuthTag(encrypted.subarray(length));
    return Buffer.concat([
      decipher.update(encrypted.subarray(0, length)),
      decipher.final(),
    ]);
  } catch {
    throw new FileContainerError(
      "AUTHENTICATION_FAILED",
      `File container chunk ${index} authentication failed.`,
    );
  }
}

async function removeOutput(path: string): Promise<void> {
  await rm(path, { force: true }).catch(() => undefined);
}

export async function readFileContainerMetadata(
  input: ReadFileContainerInput,
): Promise<FileContainerMetadata> {
  const container = await openAuthenticatedContainer(input.path, input.key);
  try {
    return container.metadata;
  } finally {
    await container.handle.close();
  }
}

export async function* readFileContainerRange(
  input: ReadFileContainerRangeInput,
): AsyncGenerator<Buffer> {
  const container = await openAuthenticatedContainer(input.path, input.key);
  try {
    if (
      !Number.isSafeInteger(input.start) ||
      !Number.isSafeInteger(input.endExclusive) ||
      input.start < 0 ||
      input.endExclusive < input.start ||
      input.endExclusive > container.metadata.originalSize
    ) {
      throw new FileContainerError(
        "INVALID_RANGE",
        "Requested byte range is outside the original file.",
      );
    }
    if (input.start === input.endExclusive) return;

    const firstChunk = Math.floor(input.start / container.metadata.chunkSize);
    const lastChunk = Math.floor(
      (input.endExclusive - 1) / container.metadata.chunkSize,
    );
    for (let index = firstChunk; index <= lastChunk; index += 1) {
      const plaintext = await readDecryptedChunk(container, index, input.key);
      const chunkStart = index * container.metadata.chunkSize;
      const sliceStart = Math.max(input.start - chunkStart, 0);
      const sliceEnd = Math.min(
        input.endExclusive - chunkStart,
        plaintext.byteLength,
      );
      const selected = Buffer.from(plaintext.subarray(sliceStart, sliceEnd));
      plaintext.fill(0);
      yield selected;
    }
  } finally {
    await container.handle.close();
  }
}

export async function decryptFileContainer(
  input: DecryptFileContainerInput,
): Promise<FileContainerMetadata> {
  const container = await openAuthenticatedContainer(
    input.inputPath,
    input.key,
  );
  let destination: FileHandle | undefined;
  let destinationCreated = false;
  try {
    destination = await open(input.outputPath, "wx");
    destinationCreated = true;
    let outputPosition = 0;
    for (let index = 0; index < container.metadata.chunkCount; index += 1) {
      const plaintext = await readDecryptedChunk(container, index, input.key);
      await writeExactly(destination, plaintext, outputPosition);
      outputPosition += plaintext.byteLength;
      plaintext.fill(0);
    }
    await destination.sync();
    return container.metadata;
  } catch (error) {
    if (destination) await destination.close();
    destination = undefined;
    if (destinationCreated) await removeOutput(input.outputPath);
    throw error;
  } finally {
    await container.handle.close();
    if (destination) await destination.close();
  }
}
