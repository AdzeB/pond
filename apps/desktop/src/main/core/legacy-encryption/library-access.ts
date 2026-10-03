import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readOrCreatePondId } from "../../lib/pond-identity";
import { resolvePaths } from "../../paths";
import { isEncryptedLibraryFile } from "../storage/library-file-storage";
import {
  libraryKeyInstalled,
  loadLibraryKeyFromSecureStorage,
  loadLibraryKeyIfAvailable,
} from "./library-key-runtime";
import { LIBRARY_SECURITY_MANIFEST_FILENAME } from "./library-security-manifest";

interface LegacyLibraryAccessPorts {
  paths(): Pick<
    ReturnType<typeof resolvePaths>,
    "libraryRoot" | "thumbnailCache"
  >;
  loadKey: typeof loadLibraryKeyFromSecureStorage;
  loadKeyIfAvailable: typeof loadLibraryKeyIfAvailable;
}

export function createLegacyLibraryAccess(ports: LegacyLibraryAccessPorts) {
  return async function prepareLegacyLibraryRead(): Promise<void> {
    const paths = ports.paths();
    const hasManifest = existsSync(
      join(paths.libraryRoot, LIBRARY_SECURITY_MANIFEST_FILENAME),
    );
    const hasInterruptedSetup = existsSync(
      join(paths.libraryRoot, ".security", "encryption-migration.json"),
    );
    const hasEncryptedMetadata = [
      "organization.json",
      "settings.json",
      "tags.json",
    ].some((name) => {
      const file = join(paths.libraryRoot, name);
      return existsSync(file) && isEncryptedLibraryFile(readFileSync(file));
    });
    const libraryId = readOrCreatePondId(paths.libraryRoot);
    if (libraryKeyInstalled(libraryId)) return;
    const roots = [paths.libraryRoot, paths.thumbnailCache];
    if (hasManifest || hasInterruptedSetup || hasEncryptedMetadata) {
      await ports.loadKey(libraryId, roots);
      return;
    }
    await ports.loadKeyIfAvailable(libraryId, roots);
  };
}

export const prepareLegacyLibraryRead = createLegacyLibraryAccess({
  paths: resolvePaths,
  loadKey: loadLibraryKeyFromSecureStorage,
  loadKeyIfAvailable: loadLibraryKeyIfAvailable,
});
