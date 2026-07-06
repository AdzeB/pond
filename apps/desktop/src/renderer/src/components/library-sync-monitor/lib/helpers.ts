import type { SyncRun } from "@/hooks/use-sync-history";
import { relativeTime } from "@/lib/util/relative-time";
import type { SyncSourceStatus } from "@/stores/sync-monitor";

// Coarse tone bucket so a run reads at a glance across pills, dots, and rows.
type Tone = "ok" | "warn" | "err" | "noop";

export function runTone(run: SyncRun): Tone {
  switch (run.outcome) {
    case "ok":
      return "ok";
    case "noop":
      return "noop";
    case "auth_required":
    case "rate_limited":
      return "warn";
    case "aborted":
      return "warn";
    case "error":
      return "err";
  }
}

// Short status label for the outcome pill / badge.
export function runLabel(run: SyncRun): string {
  switch (run.outcome) {
    case "ok":
      return "Success";
    case "noop":
      return "No new";
    case "auth_required":
      return "Auth";
    case "rate_limited":
      return "Rate limited";
    case "aborted":
      return run.watchdogTripped ? "Recovered" : "Stopped";
    case "error":
      return run.error?.name === "AuthError" ? "Auth" : "Error";
  }
}

// Human result line for the run, mirroring the legacy timeline copy.
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

// Items a run contributed; null when there's nothing meaningful to show.
export function runItems(run: SyncRun): number | null {
  if (run.outcome === "error" || run.outcome === "auth_required") return null;
  return run.enqueue?.succeeded ?? run.harvest?.fresh ?? 0;
}

// Compact run duration: 940ms, 9.4s, 1m 4s.
export function formatRunDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${Math.round(sec % 60)}s`;
}

// Local wall-clock HH:MM for run timestamps.
export function formatClock(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// "Today" / "Yesterday" / "Earlier" bucket for grouping the runs table.
export function dayBucket(ms: number): "Today" | "Yesterday" | "Earlier" {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStart = start.getTime();
  const dayMs = 86_400_000;
  if (ms >= todayStart) return "Today";
  if (ms >= todayStart - dayMs) return "Yesterday";
  return "Earlier";
}

export function prettyTrigger(trigger: string): string {
  if (!trigger) return "manual";
  return trigger.replace(/[_-]/g, " ");
}

// Title-cased trigger for the run dialog facts.
export function titleTrigger(trigger: string): string {
  const t = prettyTrigger(trigger);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Card-level health bucket derived from the live store status.
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
