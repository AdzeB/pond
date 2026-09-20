import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  decodeLibraryFile,
  encodeLibraryFile,
  isEncryptedLibraryFile,
} from "./library-file-storage";
import { clearLibraryKey, installLibraryKey } from "./library-key-runtime";

const roots: string[] = [];

afterEach(() => {
  clearLibraryKey();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "pond-file-storage-"));
  roots.push(root);
  return root;
}

describe("Library file storage", () => {
  it("encrypts Library content and authenticates its path-independent bytes", () => {
    const root = createRoot();
    installLibraryKey("library-id", Buffer.alloc(32, 7), root);
    const file = join(root, "settings.json");

    const encrypted = encodeLibraryFile(file, "private");

    expect(isEncryptedLibraryFile(encrypted)).toBe(true);
    expect(encrypted.toString("utf8")).not.toContain("private");
    expect(decodeLibraryFile(file, encrypted).toString("utf8")).toBe("private");
  });

  it("keeps picker and security metadata readable", () => {
    const root = createRoot();
    installLibraryKey("library-id", Buffer.alloc(32, 7), root);

    expect(
      isEncryptedLibraryFile(
        encodeLibraryFile(join(root, "metadata.json"), "{}"),
      ),
    ).toBe(false);
    expect(
      isEncryptedLibraryFile(
        encodeLibraryFile(join(root, "library-security.json"), "{}"),
      ),
    ).toBe(false);
  });

  it("rejects tampered ciphertext", () => {
    const root = createRoot();
    installLibraryKey("library-id", Buffer.alloc(32, 7), root);
    const file = join(root, "settings.json");
    const encrypted = encodeLibraryFile(file, "private");
    const last = encrypted.byteLength - 1;
    encrypted[last] = (encrypted[last] ?? 0) ^ 1;

    expect(() => decodeLibraryFile(file, encrypted)).toThrow(
      "authentication failed",
    );
  });
});
