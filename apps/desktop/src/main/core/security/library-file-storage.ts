import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { z } from "zod";
import {
  activeLibraryContains,
  deriveLibrarySubkey,
} from "./library-key-runtime";
import { LIBRARY_SECURITY_MANIFEST_FILENAME } from "./library-security-manifest";

const MAGIC = Buffer.from("PONDBUF1", "ascii");
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.byteLength + NONCE_BYTES + 8;
const UNENCRYPTED_FILES = new Set([
  "metadata.json",
  LIBRARY_SECURITY_MANIFEST_FILENAME,
]);
const LibraryFileValueSchema = z.union([
  z.string().transform((value) => Buffer.from(value, "utf8")),
  z.instanceof(Uint8Array).transform((value) => Buffer.from(value)),
]);

export function encodeLibraryFile(
  path: string,
  value: string | Uint8Array,
): Buffer {
  const plaintext = LibraryFileValueSchema.parse(value);
  if (!shouldEncrypt(path)) return plaintext;

  const key = deriveLibrarySubkey("files:v1");
  const nonce = randomBytes(NONCE_BYTES);
  const header = Buffer.alloc(HEADER_BYTES);
  MAGIC.copy(header);
  nonce.copy(header, MAGIC.byteLength);
  header.writeBigUInt64BE(BigInt(plaintext.byteLength), MAGIC.byteLength + 12);
  try {
    const cipher = createCipheriv("aes-256-gcm", key, nonce, {
      authTagLength: TAG_BYTES,
    });
    cipher.setAAD(header);
    return Buffer.concat([
      header,
      cipher.update(plaintext),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
  } finally {
    key.fill(0);
    nonce.fill(0);
    plaintext.fill(0);
  }
}

export function decodeLibraryFile(_path: string, value: Uint8Array): Buffer {
  const stored = Buffer.from(value);
  if (!isEncryptedLibraryFile(stored)) return stored;
  if (stored.byteLength < HEADER_BYTES + TAG_BYTES) {
    stored.fill(0);
    throw new Error("Encrypted Library file is truncated.");
  }

  const header = stored.subarray(0, HEADER_BYTES);
  const size = Number(header.readBigUInt64BE(MAGIC.byteLength + NONCE_BYTES));
  const ciphertext = stored.subarray(HEADER_BYTES, -TAG_BYTES);
  if (!Number.isSafeInteger(size) || size !== ciphertext.byteLength) {
    stored.fill(0);
    throw new Error("Encrypted Library file has an invalid length.");
  }

  const key = deriveLibrarySubkey("files:v1");
  const nonce = header.subarray(
    MAGIC.byteLength,
    MAGIC.byteLength + NONCE_BYTES,
  );
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, nonce, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(header);
    decipher.setAuthTag(stored.subarray(-TAG_BYTES));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Encrypted Library file authentication failed.");
  } finally {
    key.fill(0);
    stored.fill(0);
  }
}

export function readLibraryFileSync(path: string): Buffer {
  return decodeLibraryFile(path, readFileSync(path));
}

export function isEncryptedLibraryFile(value: Uint8Array): boolean {
  return (
    value.byteLength >= MAGIC.byteLength &&
    Buffer.from(value).subarray(0, MAGIC.byteLength).equals(MAGIC)
  );
}

function shouldEncrypt(path: string): boolean {
  return activeLibraryContains(path) && !UNENCRYPTED_FILES.has(basename(path));
}
