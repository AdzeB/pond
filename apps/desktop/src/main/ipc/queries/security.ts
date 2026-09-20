import { z } from "zod";
import { KEYCHAIN_DATABASE_LIBRARY_PREFIX } from "../../../shared/constants";
import { getPrefs } from "../../core/prefs";
import {
  changeLibraryPassword,
  librarySecurityStatus,
  lockLibraryNow,
  rotateLibraryRecovery,
  unlockLibraryWithAppPassword,
  unlockLibraryWithAppRecoveryKey,
  unlockLibraryWithBiometric,
} from "../../core/security/app-lock-runtime";
import { setupLibrarySecurity } from "../../core/security/library-security-setup";
import { getDb } from "../../db";
import { flushPendingDeepLink } from "../../deep-link";
import { deleteSecret } from "../../keychain";
import { readOrCreatePondId } from "../../lib/pond-identity";
import { resolvePaths } from "../../paths";
import { type QueryHandlerMap, query, StringParam } from "./params";

export const securityQueries = {
  "security.status": query(z.object({}), async () => {
    const status = librarySecurityStatus();
    const prefs = await getPrefs();
    return {
      ...status,
      biometricAvailable:
        status.biometricAvailable && prefs.security.biometricUnlock,
    };
  }),
  "security.unlock": query(
    z.object({ password: StringParam }),
    async ({ password }) =>
      resumeAfterUnlock(await unlockLibraryWithAppPassword(password)),
  ),
  "security.unlockRecovery": query(
    z.object({ recoveryKey: StringParam }),
    async ({ recoveryKey }) =>
      resumeAfterUnlock(await unlockLibraryWithAppRecoveryKey(recoveryKey)),
  ),
  "security.unlockBiometric": query(z.object({}), async () => {
    const prefs = await getPrefs();
    return prefs.security.biometricUnlock
      ? resumeAfterUnlock(await unlockLibraryWithBiometric())
      : { ok: false as const, error: "unavailable" as const };
  }),
  "security.lockNow": query(z.object({}), () => {
    lockLibraryNow();
    return { ok: true as const };
  }),
  "security.changePassword": query(
    z.object({
      currentPassword: StringParam,
      newPassword: z.string().min(8).max(1_024),
    }),
    ({ currentPassword, newPassword }) =>
      changeLibraryPassword(currentPassword, newPassword),
  ),
  "security.rotateRecoveryKey": query(
    z.object({ password: StringParam }),
    ({ password }) => rotateLibraryRecovery(password),
  ),
  "security.setup": query(
    z.object({ password: z.string().min(8).max(1_024) }),
    async ({ password }) => {
      if (librarySecurityStatus().configured) {
        return { ok: false, error: "already_configured" as const };
      }
      const paths = resolvePaths();
      const libraryId = readOrCreatePondId(paths.libraryRoot);
      const db = await getDb();
      try {
        const { captures } = await import("../../core/captures");
        await captures.securePending();
        const result = await setupLibrarySecurity({
          libraryId,
          password,
          libraryRoot: paths.libraryRoot,
          cacheRoot: paths.thumbnailCache,
          indexPath: paths.indexDb,
          indexConnection: db.$raw,
        });
        await deleteSecret(
          `${KEYCHAIN_DATABASE_LIBRARY_PREFIX}:${libraryId}`,
        ).catch(() => {});
        return {
          ok: true,
          recoveryKey: result.recoveryKey,
          backupPath: result.backupPath,
        };
      } catch {
        return { ok: false, error: "migration_failed" as const };
      }
    },
  ),
} satisfies QueryHandlerMap;

async function resumeAfterUnlock<T extends { ok: boolean }>(
  result: T,
): Promise<T> {
  if (!result.ok) return result;
  const { captures } = await import("../../core/captures");
  void captures.recover();
  setTimeout(flushPendingDeepLink, 100).unref();
  return result;
}
