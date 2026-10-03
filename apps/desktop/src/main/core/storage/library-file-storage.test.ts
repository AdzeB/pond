import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import legacyFixture from "../legacy-encryption/legacy-storage-fixture.json";
import {
  clearLibraryKey,
  installLibraryKey,
} from "../legacy-encryption/library-key-runtime";
import {
  decodeLibraryFile,
  encodeLibraryFile,
  isEncryptedLibraryFile,
} from "./library-file-storage";

const roots: string[] = [];

afterEach(() => {
  clearLibraryKey();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "pond-file-storage-"));
  roots.push(root);
  installLibraryKey(
    legacyFixture.libraryId,
    Buffer.from(legacyFixture.masterKey, "base64"),
    root,
  );
  return root;
}

describe("Library file storage", () => {
  it("writes plaintext even when a legacy Library key is installed", () => {
    const root = createRoot();
    for (const name of [
      "settings.json",
      "metadata.json",
      "library-security.json",
    ]) {
      const file = join(root, name);
      const encoded = encodeLibraryFile(file, "private");
      expect(isEncryptedLibraryFile(encoded)).toBe(false);
      expect(encoded.toString("utf8")).toBe("private");
      expect(decodeLibraryFile(file, encoded).toString("utf8")).toBe("private");
    }
  });

  it("decodes legacy encrypted metadata", () => {
    const root = createRoot();
    const encoded = Buffer.from(legacyFixture.files.metadata, "base64");
    expect(isEncryptedLibraryFile(encoded)).toBe(true);
    expect(
      decodeLibraryFile(join(root, "settings.json"), encoded).toString("utf8"),
    ).toBe(legacyFixture.filePlaintext);
  });

  it("rejects tampered legacy ciphertext", () => {
    const root = createRoot();
    const encrypted = Buffer.from(legacyFixture.files.metadata, "base64");
    const last = encrypted.byteLength - 1;
    encrypted[last] = (encrypted[last] ?? 0) ^ 1;
    expect(() =>
      decodeLibraryFile(join(root, "settings.json"), encrypted),
    ).toThrow("authentication failed");
  });
});
