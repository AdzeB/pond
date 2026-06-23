import type { Source } from "@pond/schema/db";
import { IPC } from "../../../shared/constants";
import {
  cancelTweetScreenshotBackfill,
  getBackfillStatus,
  isBackfillRunning,
  startTweetScreenshotBackfill,
} from "../../core/pipeline/enqueue";
import {
  governorSnapshot,
  isAllPaused,
  pauseAll,
  resumeAll,
  resumeSource,
} from "../../core/pipeline/rate-governor";
import {
  cancelSync,
  getSourceSync,
  isSyncing,
  syncAllSources,
  syncSource,
} from "../../core/sync";
import { safeHandle } from "../helpers";

export function registerSyncHandlers(): void {
  safeHandle(
    IPC.syncRunNow,
    async (_, source: string, opts?: { forceFull?: boolean }) => {
      const src = source as Source;
      if (isSyncing(src)) {
        return { ok: false as const, reason: "already_running" as const };
      }
      // forceFull is the "Full re-sync" escape hatch: ignore the incremental
      // watermark and walk the whole remote list (drift recovery).
      void syncSource(src, {
        trigger: "manual",
        forceFull: opts?.forceFull ?? false,
      });
      return { ok: true as const };
    },
  );

  safeHandle(IPC.syncStatus, async (_, source: string) => {
    const src = source as Source;
    const cfg = await getSourceSync(src);
    return {
      ok: true as const,
      running: isSyncing(src),
      lastSyncedAt: cfg.lastSyncedAt,
      lastError: cfg.lastError,
    };
  });

  safeHandle(IPC.syncRunAll, async (_, opts?: { forceFull?: boolean }) => {
    void syncAllSources({
      trigger: "manual",
      forceFull: opts?.forceFull ?? false,
    });
    return { ok: true as const };
  });

  safeHandle(IPC.syncCancel, async (_, source: string) => {
    const src = source as Source;
    const running = isSyncing(src);
    cancelSync(src);
    return { ok: true as const, running };
  });

  safeHandle(IPC.screenshotBackfillRun, async () => {
    if (isBackfillRunning()) {
      return { ok: false as const, reason: "already_running" as const };
    }
    void startTweetScreenshotBackfill();
    return { ok: true as const };
  });

  safeHandle(IPC.screenshotBackfillCancel, async () => {
    cancelTweetScreenshotBackfill();
    return { ok: true as const };
  });

  safeHandle(IPC.screenshotBackfillStatus, async () => getBackfillStatus());

  // ── Rate governor (account safety) ────────────────────────────────────────
  safeHandle(IPC.governorSnapshot, async () => governorSnapshot());

  safeHandle(IPC.governorSetPaused, async (_, paused: boolean) => {
    if (paused) pauseAll();
    else resumeAll();
    return { ok: true as const, allPaused: isAllPaused() };
  });

  safeHandle(IPC.governorResumeSource, async (_, source: string) => {
    resumeSource(source as Source);
    return { ok: true as const };
  });
}
