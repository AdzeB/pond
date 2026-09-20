import { hkdfSync } from "node:crypto";
import { relative, resolve, sep } from "node:path";
import { KEYCHAIN_LIBRARY_MASTER_KEY_PREFIX } from "../../../shared/constants";
import { getSecureSecretBytes } from "../../keychain";
import { LIBRARY_MASTER_KEY_BYTES } from "./library-security-manifest";

interface InstalledLibraryKey {
  libraryId: string;
  key: Buffer;
  roots: string[];
}

let installed: InstalledLibraryKey | null = null;

export async function loadLibraryKeyFromSecureStorage(
  libraryId: string,
  roots: string[] = [],
): Promise<void> {
  const key = await getSecureSecretBytes(
    `${KEYCHAIN_LIBRARY_MASTER_KEY_PREFIX}:${libraryId}`,
    LIBRARY_MASTER_KEY_BYTES,
  );
  if (!key) throw new Error("The Library key is unavailable.");
  try {
    installLibraryKey(libraryId, key, roots);
  } finally {
    key.fill(0);
  }
}

export function installLibraryKey(
  libraryId: string,
  key: Uint8Array,
  roots: string | string[] = [],
): void {
  if (key.byteLength !== LIBRARY_MASTER_KEY_BYTES) {
    throw new Error(
      `Library keys must contain ${LIBRARY_MASTER_KEY_BYTES} bytes.`,
    );
  }
  clearLibraryKey();
  installed = {
    libraryId,
    key: Buffer.from(key),
    roots: (Array.isArray(roots) ? roots : [roots]).map((root) =>
      resolve(root),
    ),
  };
}

export function clearLibraryKey(): void {
  installed?.key.fill(0);
  installed = null;
}

export function libraryKeyInstalled(libraryId?: string): boolean {
  return (
    installed !== null && (!libraryId || installed.libraryId === libraryId)
  );
}

export function deriveLibrarySubkey(purpose: string): Buffer {
  if (!installed) throw new Error("The Library is locked.");
  if (!purpose) throw new Error("A key purpose is required.");
  return Buffer.from(
    hkdfSync(
      "sha256",
      installed.key,
      Buffer.from(installed.libraryId, "utf8"),
      Buffer.from(`pond:${purpose}`, "utf8"),
      LIBRARY_MASTER_KEY_BYTES,
    ),
  );
}

export function activeLibraryContains(path: string): boolean {
  if (!installed) return false;
  const candidate = resolve(path);
  return installed.roots.some((root) => {
    const child = relative(root, candidate);
    return child === "" || (!child.startsWith(`..${sep}`) && child !== "..");
  });
}
