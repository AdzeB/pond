import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { systemPreferences } from "electron";
import { IPC } from "../../../shared/constants";
import type { LibrarySecurityStatus } from "../../../shared/security-contracts";
import { closeDb } from "../../database/lifecycle";
import { getDb } from "../../db";
import { readOrCreatePondId } from "../../lib/pond-identity";
import { resolvePaths } from "../../paths";
import { clearFolderUnlockSessions } from "./folder-passwords";
import {
  clearLibraryKey,
  installLibraryKey,
  libraryKeyInstalled,
  loadLibraryKeyFromSecureStorage,
} from "./library-key-runtime";
import { clearExternalLibraryMedia } from "./library-media-storage";
import {
  LibrarySecurityUnlockError,
  rotateLibraryPassword,
  rotateLibraryRecoveryKey,
  unlockLibraryWithPassword,
  unlockLibraryWithRecoveryKey,
  zeroizeSecret,
} from "./library-security";
import {
  LIBRARY_SECURITY_MANIFEST_FILENAME,
  parseLibrarySecurityManifest,
  serializeLibrarySecurityManifest,
} from "./library-security-manifest";

type UnlockResult = {
  ok: boolean;
  error?: "invalid_secret" | "unavailable";
};

class LibraryLockedError extends Error {
  readonly code = "LIBRARY_LOCKED";

  constructor() {
    super("The Library is locked.");
    this.name = "LibraryLockedError";
  }
}

export function librarySecurityStatus(): LibrarySecurityStatus {
  const paths = resolvePaths();
  const configured = existsSync(
    join(paths.libraryRoot, LIBRARY_SECURITY_MANIFEST_FILENAME),
  );
  const pondId = configured ? readOrCreatePondId(paths.libraryRoot) : undefined;
  const biometricSupported =
    process.platform === "darwin" &&
    Boolean(systemPreferences?.canPromptTouchID?.());
  return {
    configured,
    state: !configured
      ? "unconfigured"
      : libraryKeyInstalled(pondId)
        ? "unlocked"
        : "locked",
    biometricSupported,
    biometricAvailable: biometricSupported,
    recoveryAvailable: configured,
  };
}

export function assertLibraryUnlocked(): void {
  const status = librarySecurityStatus();
  if (status.configured && status.state !== "unlocked") {
    throw new LibraryLockedError();
  }
}

export async function unlockLibraryWithAppPassword(
  password: string,
): Promise<UnlockResult> {
  return unlockLibrary("password", password);
}

export async function unlockLibraryWithAppRecoveryKey(
  recoveryKey: string,
): Promise<UnlockResult> {
  return unlockLibrary("recovery", recoveryKey);
}

export async function unlockLibraryWithBiometric(): Promise<UnlockResult> {
  const paths = resolvePaths();
  const manifest = await readManifest(paths.libraryRoot).catch(() => null);
  if (!manifest) return { ok: false, error: "unavailable" };
  try {
    if (
      process.platform !== "darwin" ||
      !systemPreferences.canPromptTouchID()
    ) {
      return { ok: false, error: "unavailable" };
    }
    await systemPreferences.promptTouchID("Unlock your Pond Library.");
    await loadLibraryKeyFromSecureStorage(manifest.libraryId, [
      paths.libraryRoot,
      paths.thumbnailCache,
    ]);
    await getDb();
    notifySecurityState();
    return { ok: true };
  } catch {
    clearLibraryKey();
    return { ok: false, error: "unavailable" };
  }
}

export async function restoreLibraryUnlock(): Promise<UnlockResult> {
  const paths = resolvePaths();
  const manifest = await readManifest(paths.libraryRoot).catch(() => null);
  if (!manifest) return { ok: false, error: "unavailable" };
  try {
    await loadLibraryKeyFromSecureStorage(manifest.libraryId, [
      paths.libraryRoot,
      paths.thumbnailCache,
    ]);
    return { ok: true };
  } catch {
    clearLibraryKey();
    return { ok: false, error: "unavailable" };
  }
}

export function lockLibraryNow(): void {
  clearFolderUnlockSessions();
  void clearExternalLibraryMedia();
  closeDb();
  clearLibraryKey();
  notifySecurityState();
}

export async function changeLibraryPassword(
  currentPassword: string,
  newPassword: string,
): Promise<UnlockResult> {
  const paths = resolvePaths();
  const manifest = await readManifest(paths.libraryRoot).catch(() => null);
  if (!manifest) return { ok: false, error: "unavailable" };
  try {
    const rotated = await rotateLibraryPassword({
      manifest,
      currentPassword,
      newPassword,
    });
    await writeManifest(paths.libraryRoot, rotated);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof LibrarySecurityUnlockError
          ? "invalid_secret"
          : "unavailable",
    };
  }
}

export async function rotateLibraryRecovery(
  password: string,
): Promise<UnlockResult & { recoveryKey?: string }> {
  const paths = resolvePaths();
  const manifest = await readManifest(paths.libraryRoot).catch(() => null);
  if (!manifest) return { ok: false, error: "unavailable" };
  try {
    const rotated = await rotateLibraryRecoveryKey({ manifest, password });
    await writeManifest(paths.libraryRoot, rotated.manifest);
    return { ok: true, recoveryKey: rotated.recoveryKey };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof LibrarySecurityUnlockError
          ? "invalid_secret"
          : "unavailable",
    };
  }
}

async function unlockLibrary(
  kind: "password" | "recovery",
  secret: string,
): Promise<UnlockResult> {
  const paths = resolvePaths();
  const manifest = await readManifest(paths.libraryRoot).catch(() => null);
  if (!manifest) return { ok: false, error: "unavailable" };
  const expectedId = readOrCreatePondId(paths.libraryRoot);
  if (manifest.libraryId !== expectedId) {
    return { ok: false, error: "unavailable" };
  }

  let masterKey: Buffer | null = null;
  try {
    masterKey =
      kind === "password"
        ? await unlockLibraryWithPassword(manifest, secret)
        : await unlockLibraryWithRecoveryKey(manifest, secret);
    installLibraryKey(manifest.libraryId, masterKey, [
      paths.libraryRoot,
      paths.thumbnailCache,
    ]);
    await getDb();
    notifySecurityState();
    return { ok: true };
  } catch (error) {
    clearLibraryKey();
    return {
      ok: false,
      error:
        error instanceof LibrarySecurityUnlockError
          ? "invalid_secret"
          : "unavailable",
    };
  } finally {
    if (masterKey) zeroizeSecret(masterKey);
  }
}

async function readManifest(root: string) {
  return parseLibrarySecurityManifest(
    await readFile(join(root, LIBRARY_SECURITY_MANIFEST_FILENAME), "utf8"),
  );
}

async function writeManifest(
  root: string,
  manifest: Awaited<ReturnType<typeof readManifest>>,
): Promise<void> {
  const path = join(root, LIBRARY_SECURITY_MANIFEST_FILENAME);
  const temporary = `${path}.tmp`;
  await writeFile(temporary, serializeLibrarySecurityManifest(manifest), {
    mode: 0o600,
  });
  await rename(temporary, path);
}

function notifySecurityState(): void {
  void import("electron").then(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC.securityState);
    }
  });
}
