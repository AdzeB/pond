import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Source } from "@pond/schema/db";
import { type RateProfile, syncConfigFor } from "@pond/schema/sources";
import { app } from "electron";
import log from "electron-log/main.js";

// Shared state, persistence, and UI snapshot for the rate governor. The request
// path (acquire / report / cooldowns) lives in `rate-governor.ts` and mutates
// the maps exported here; the `let` primitives (allPaused / loaded / timer) are
// only ever reassigned inside this module.

type PausedReason = "cooldown" | "breaker" | "at_risk" | "manual";

export interface PausedState {
  source: Source;
  until: number;
  reason: PausedReason;
}

export type AtRiskKind =
  | "challenge"
  | "checkpoint"
  | "captcha"
  | "login"
  | "rate_limit";

export interface AtRiskState {
  source: Source;
  kind: AtRiskKind;
  since: number;
  note: string;
}

// Circuit breaker: N transient failures inside the window trips a long pause.
export const BREAKER_WINDOW_MS = 60_000;
export const BREAKER_THRESHOLD = 3;
export const BREAKER_TRIP_MS = 10 * 60_000;

// AIMD bounds for the per-source delay multiplier.
export const MULTIPLIER_MIN = 1;
export const MULTIPLIER_MAX = 8;
export const MULTIPLIER_INCREASE = 2; // multiplicative increase under pressure
export const MULTIPLIER_DECREASE = 0.1; // additive decrease on success (slow to speed up)

// How long an at-risk source stays parked before we let it try again.
export const AT_RISK_PARK_MS = 30 * 60_000;

// Persist at most this often; cooldowns/at-risk flush immediately, the hot
// request log is debounced.
const PERSIST_DEBOUNCE_MS = 3_000;

interface PersistShape {
  schemaVersion: 1;
  cooldownUntil: Partial<Record<Source, number>>;
  breakerUntil: Partial<Record<Source, number>>;
  atRisk: Partial<Record<Source, AtRiskState>>;
  // Recent request timestamps per source, pruned to the largest window.
  requestLog: Partial<Record<Source, number[]>>;
  allPausedUntil: number;
}

// ── In-memory state (authoritative; persisted lazily) ───────────────────────
export const cooldownUntil = new Map<Source, number>();
export const breakerUntil = new Map<Source, number>();
export const breakerCounters = new Map<
  Source,
  { count: number; firstAt: number }
>();
export const atRisk = new Map<Source, AtRiskState>();
export const requestLog = new Map<Source, number[]>();
export const lastRequestAt = new Map<Source, number>();
export const multiplier = new Map<Source, number>();
export const manualPaused = new Set<Source>();
export let allPaused = false;
let loaded = false;
let persistTimer: NodeJS.Timeout | null = null;

export function profile(source: Source): RateProfile {
  return syncConfigFor(source).rate;
}

export function now(): number {
  return Date.now();
}

// ── Persistence ─────────────────────────────────────────────────────────────
function statePath(): string {
  return join(app.getPath("userData"), "rate-governor.json");
}

export function loadState(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = readFileSync(statePath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    const t = now();
    for (const [s, until] of Object.entries(parsed.cooldownUntil ?? {})) {
      if (typeof until === "number" && until > t)
        cooldownUntil.set(s as Source, until);
    }
    for (const [s, until] of Object.entries(parsed.breakerUntil ?? {})) {
      if (typeof until === "number" && until > t)
        breakerUntil.set(s as Source, until);
    }
    for (const [s, st] of Object.entries(parsed.atRisk ?? {})) {
      if (st && typeof st === "object")
        atRisk.set(s as Source, st as AtRiskState);
    }
    for (const [s, log_] of Object.entries(parsed.requestLog ?? {})) {
      if (Array.isArray(log_)) requestLog.set(s as Source, log_.slice(-500));
    }
    if (
      typeof parsed.allPausedUntil === "number" &&
      parsed.allPausedUntil > t
    ) {
      allPaused = true;
    }
    log.info("[pond governor] loaded persisted state", {
      cooldowns: cooldownUntil.size,
      atRisk: atRisk.size,
    });
  } catch {
    // No prior state (first run) or unreadable — start clean.
  }
}

export function schedulePersist(immediate = false): void {
  if (immediate) {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    writeState();
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeState();
  }, PERSIST_DEBOUNCE_MS);
}

function writeState(): void {
  try {
    const body: PersistShape = {
      schemaVersion: 1,
      cooldownUntil: Object.fromEntries(
        cooldownUntil,
      ) as PersistShape["cooldownUntil"],
      breakerUntil: Object.fromEntries(
        breakerUntil,
      ) as PersistShape["breakerUntil"],
      atRisk: Object.fromEntries(atRisk) as PersistShape["atRisk"],
      requestLog: Object.fromEntries(requestLog) as PersistShape["requestLog"],
      allPausedUntil: allPaused ? now() + 365 * 24 * 60 * 60_000 : 0,
    };
    const file = statePath();
    if (!existsSync(dirname(file)))
      mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(body));
  } catch (err) {
    log.warn("[pond governor] failed to persist state", err);
  }
}

// ── Kill switch ─────────────────────────────────────────────────────────────
export function pauseAll(): void {
  allPaused = true;
  schedulePersist(true);
}

export function resumeAll(): void {
  allPaused = false;
  schedulePersist(true);
}

export function isAllPaused(): boolean {
  loadState();
  return allPaused;
}

export function snapshotSourceGate(): PausedState[] {
  loadState();
  const t = now();
  const out = new Map<Source, PausedState>();
  const consider = (
    source: Source,
    until: number,
    reason: PausedReason,
  ): void => {
    if (until <= t) return;
    const prev = out.get(source);
    if (!prev || until > prev.until) out.set(source, { source, until, reason });
  };
  for (const [s, until] of cooldownUntil) consider(s, until, "cooldown");
  for (const [s, until] of breakerUntil) consider(s, until, "breaker");
  for (const [s, st] of atRisk)
    consider(s, st.since + AT_RISK_PARK_MS, "at_risk");
  for (const s of manualPaused) consider(s, Number.MAX_SAFE_INTEGER, "manual");
  return [...out.values()];
}
