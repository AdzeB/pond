import type { Source } from "@pond/schema/db";
import { IPC } from "../../../shared/constants";
import {
  cancelSync,
  getGlobalSync,
  getSourceSync,
  isSyncing,
  syncAllSources,
  syncSource,
} from "../../core/sync";
import { safeHandle } from "../helpers";

export function registerSyncHandlers(): void {
  safeHandle(IPC.syncRunNow, async (_, source: string) => {
    const src = source as Source;
    if (isSyncing(src)) {
      return { ok: false as const, reason: "already_running" as const };
    }
    void syncSource(src, { trigger: "manual" });
    return { ok: true as const };
  });

  safeHandle(IPC.syncStatus, async (_, source: string) => {
    const src = source as Source;
    const [cfg, global] = await Promise.all([
      getSourceSync(src),
      getGlobalSync(),
    ]);
    return {
      ok: true as const,
      running: isSyncing(src),
      enabled: global.enabled,
      frequency: global.frequency,
      lastSyncedAt: cfg.lastSyncedAt,
      lastError: cfg.lastError,
    };
  });

  safeHandle(IPC.syncRunAll, async () => {
    void syncAllSources({ trigger: "manual" });
    return { ok: true as const };
  });

  safeHandle(IPC.syncCancel, async (_, source: string) => {
    const src = source as Source;
    const running = isSyncing(src);
    cancelSync(src);
    return { ok: true as const, running };
  });
}
