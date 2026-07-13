import type { SyncRun } from "@/hooks/use-sync-history";
import { relativeTime } from "@/lib/util/relative-time";
import type { SyncSourceStatus } from "@/stores/sync-monitor";

export function describeRun(run: SyncRun): string {
  switch (run.outcome) {
    case "ok": {
      const queued = run.enqueue?.succeeded ?? run.harvest?.fresh ?? 0;
      const failed = run.enqueue?.failed ?? 0;
      const base = `Queued ${queued} item${queued === 1 ? "" : "s"} for ingest`;
      return failed > 0 ? `${base} · ${failed} failed` : base;
    }
    case "noop":
      return "Caught up — nothing new";
    case "auth_required":
      return "Sign-in required — source paused";
    case "rate_limited":
      return "Rate limited — backing off";
    case "aborted":
      return run.watchdogTripped
        ? "Watchdog reset stalled run, retried"
        : "Stopped";
    case "error":
      return run.error?.message ?? "Failed";
  }
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

type CardTone = "run" | "ok" | "err" | "idle" | "paused";

export interface CardModel {
  tone: CardTone;
  statusText: string;
  connected: boolean;
  meta: string;
  lastText: string;
}

export function cardModel(status: SyncSourceStatus | undefined): CardModel {
  const state = status?.state ?? "idle";
  const connected = status?.connected ?? false;
  const lastText = status?.lastSyncedAt
    ? relativeTime(status.lastSyncedAt)
    : "—";

  if (state === "running") {
    const p = status?.progress;
    const statusText =
      status?.message ??
      (p?.total ? `Syncing · ${p.current}/${p.total}` : "Syncing…");
    return {
      tone: "run",
      statusText,
      connected: true,
      meta: "now",
      lastText: "now",
    };
  }
  if (state === "auth_required") {
    return {
      tone: "paused",
      statusText: "Auth expired",
      connected,
      meta: "Re-auth needed",
      lastText,
    };
  }
  if (state === "paused") {
    return {
      tone: "paused",
      statusText: "Paused to protect your account",
      connected,
      meta: status?.message ?? "Backing off",
      lastText,
    };
  }
  if (state === "error") {
    return {
      tone: "err",
      statusText: status?.lastError ? "Sync failed" : "Failed",
      connected,
      meta: status?.lastError ?? "error",
      lastText,
    };
  }
  if (!connected) {
    return {
      tone: "idle",
      statusText: "Not connected",
      connected: false,
      meta: "Set up to sync",
      lastText: "—",
    };
  }
  if (state === "done") {
    return {
      tone: "ok",
      statusText: "Synced",
      connected,
      meta: "Manual",
      lastText,
    };
  }
  return {
    tone: "idle",
    statusText: status?.lastSyncedAt ? "Caught up" : "Connected",
    connected,
    meta: "Manual",
    lastText,
  };
}

export type { SyncRun };
