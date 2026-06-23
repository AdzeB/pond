import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Source } from "@pond/schema/db";
import { type RateProfile, syncConfigFor } from "@pond/schema/sources";
import { app } from "electron";
import log from "electron-log/main.js";

// ─────────────────────────────────────────────────────────────────────────────
// Rate governor: the one account-safe pacing authority for every platform
// request Pond makes. The rule is "always better to sync slowly than to risk a
// user's account."
//
//   - acquire(): block until it's safe to hit a source (spacing, rolling budget,
//     cooldown, breaker, kill switch).
//   - report(): adapt to the response (rate-limit headers / 429 / challenge) —
//     cooldowns, AIMD multiplier, at-risk.
//
// Cooldowns / at-risk / recent requests persist to userData so a restart can't
// re-hammer an account. Per-source pacing comes from the descriptor's resolved
// RateProfile. Supersedes the old in-memory `source-gate` (which now re-exports
// from here).
// ─────────────────────────────────────────────────────────────────────────────

export type PausedReason = "cooldown" | "breaker" | "at_risk" | "manual";

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
const BREAKER_WINDOW_MS = 60_000;
const BREAKER_THRESHOLD = 3;
const BREAKER_TRIP_MS = 10 * 60_000;

// AIMD bounds for the per-source delay multiplier.
const MULTIPLIER_MIN = 1;
const MULTIPLIER_MAX = 8;
const MULTIPLIER_INCREASE = 2; // multiplicative increase under pressure
const MULTIPLIER_DECREASE = 0.1; // additive decrease on success (slow to speed up)

// How long an at-risk source stays parked before we let it try again.
const AT_RISK_PARK_MS = 30 * 60_000;

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
const cooldownUntil = new Map<Source, number>();
const breakerUntil = new Map<Source, number>();
const breakerCounters = new Map<Source, { count: number; firstAt: number }>();
const atRisk = new Map<Source, AtRiskState>();
const requestLog = new Map<Source, number[]>();
const lastRequestAt = new Map<Source, number>();
const multiplier = new Map<Source, number>();
const manualPaused = new Set<Source>();
let allPaused = false;
let loaded = false;
let persistTimer: NodeJS.Timeout | null = null;

// Listeners for UI broadcast (wired in main/index.ts).
type Listener = (snapshot: GovernorSnapshot) => void;
const listeners = new Set<Listener>();

function profile(source: Source): RateProfile {
  return syncConfigFor(source).rate;
}

function now(): number {
  return Date.now();
}

// ── Persistence ─────────────────────────────────────────────────────────────
function statePath(): string {
  return join(app.getPath("userData"), "rate-governor.json");
}

function loadState(): void {
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

function schedulePersist(immediate = false): void {
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

// ── Pause computation ───────────────────────────────────────────────────────

/** Earliest time the source is allowed to be hit again (0 = now). */
export function sourcePausedUntil(source: Source): number {
  loadState();
  if (allPaused) return Number.MAX_SAFE_INTEGER;
  if (manualPaused.has(source)) return Number.MAX_SAFE_INTEGER;
  const t = now();
  let until = 0;
  const cd = cooldownUntil.get(source) ?? 0;
  if (cd > until) until = cd;
  const br = breakerUntil.get(source) ?? 0;
  if (br > until) until = br;
  const ar = atRisk.get(source);
  if (ar) {
    const parkUntil = ar.since + AT_RISK_PARK_MS;
    if (parkUntil > until) until = parkUntil;
  }
  return until <= t ? 0 : until;
}

export function setSourceCooldown(source: Source, ms: number): void {
  if (ms <= 0) return;
  loadState();
  const until = now() + ms;
  const prev = cooldownUntil.get(source) ?? 0;
  if (until <= prev) return;
  cooldownUntil.set(source, until);
  log.info("[pond governor] cooldown set", { source, ms });
  schedulePersist(true);
  emit();
}

export function noteTransientFailure(source: Source): void {
  loadState();
  const t = now();
  const entry = breakerCounters.get(source);
  if (!entry || t - entry.firstAt > BREAKER_WINDOW_MS) {
    breakerCounters.set(source, { count: 1, firstAt: t });
    return;
  }
  entry.count += 1;
  if (entry.count >= BREAKER_THRESHOLD) {
    breakerCounters.delete(source);
    const until = t + BREAKER_TRIP_MS;
    const prev = breakerUntil.get(source) ?? 0;
    if (until > prev) {
      breakerUntil.set(source, until);
      log.warn("[pond governor] circuit breaker tripped", { source });
      schedulePersist(true);
      emit();
    }
  }
}

export function noteSuccess(source: Source): void {
  // Success closes the breaker window and gently relaxes pacing. Explicit
  // cooldowns and at-risk parking stay until they expire.
  breakerCounters.delete(source);
  const m = multiplier.get(source) ?? MULTIPLIER_MIN;
  if (m > MULTIPLIER_MIN) {
    multiplier.set(source, Math.max(MULTIPLIER_MIN, m - MULTIPLIER_DECREASE));
  }
}

// ── At-risk (challenge / checkpoint / captcha / login) ──────────────────────
export function markAtRisk(source: Source, kind: AtRiskKind, note = ""): void {
  loadState();
  atRisk.set(source, { source, kind, since: now(), note });
  log.warn("[pond governor] source marked at-risk", { source, kind, note });
  schedulePersist(true);
  emit();
}

export function clearAtRisk(source: Source): void {
  if (atRisk.delete(source)) {
    schedulePersist(true);
    emit();
  }
}

export function isAtRisk(source: Source): AtRiskState | null {
  loadState();
  return atRisk.get(source) ?? null;
}

// ── Kill switch + manual per-source pause ───────────────────────────────────
export function pauseAll(): void {
  allPaused = true;
  schedulePersist(true);
  emit();
}

export function resumeAll(): void {
  allPaused = false;
  schedulePersist(true);
  emit();
}

export function isAllPaused(): boolean {
  loadState();
  return allPaused;
}

export function pauseSource(source: Source): void {
  manualPaused.add(source);
  emit();
}

export function resumeSource(source: Source): void {
  // Clears the manual pause AND any active cooldown/breaker/at-risk so the user
  // can force a retry. This is the "I understand the risk, try now" override.
  manualPaused.delete(source);
  cooldownUntil.delete(source);
  breakerUntil.delete(source);
  atRisk.delete(source);
  breakerCounters.delete(source);
  multiplier.set(source, MULTIPLIER_MIN);
  schedulePersist(true);
  emit();
}

// ── Header interpretation ───────────────────────────────────────────────────
export type HeaderBag = Record<string, string> | Headers;

function header(bag: HeaderBag, name: string): string | null {
  if (bag instanceof Headers) return bag.get(name);
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(bag)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

export interface RateSignal {
  /** Server-requested wait in seconds, if any (retry-after / reset). */
  retryAfterSec: number | null;
  /** Remaining requests in the current platform window, if advertised. */
  remaining: number | null;
}

/**
 * Parse the rate-limit signals platforms commonly send. Covers `retry-after`
 * (seconds or HTTP date), Twitter's `x-rate-limit-*`, and the generic
 * `x-ratelimit-*` family.
 */
export function parseRateSignal(bag: HeaderBag): RateSignal {
  let retryAfterSec: number | null = null;
  const retryAfter = header(bag, "retry-after");
  if (retryAfter) {
    const asNum = Number(retryAfter);
    if (Number.isFinite(asNum)) {
      retryAfterSec = Math.max(0, asNum);
    } else {
      const when = Date.parse(retryAfter);
      if (Number.isFinite(when)) {
        retryAfterSec = Math.max(0, Math.round((when - Date.now()) / 1000));
      }
    }
  }

  const resetRaw =
    header(bag, "x-rate-limit-reset") ?? header(bag, "x-ratelimit-reset");
  const remainingRaw =
    header(bag, "x-rate-limit-remaining") ??
    header(bag, "x-ratelimit-remaining");
  const remaining = remainingRaw != null ? Number(remainingRaw) : null;

  // If remaining is exhausted and a reset epoch is given, treat reset as the
  // wait even without an explicit retry-after.
  if (
    retryAfterSec == null &&
    remaining != null &&
    Number.isFinite(remaining) &&
    remaining <= 1 &&
    resetRaw
  ) {
    const resetEpoch = Number(resetRaw);
    if (Number.isFinite(resetEpoch)) {
      // Epoch seconds (10 digits) vs ms — normalize to seconds-from-now.
      const resetMs = resetEpoch > 1e12 ? resetEpoch : resetEpoch * 1000;
      retryAfterSec = Math.max(0, Math.round((resetMs - Date.now()) / 1000));
    }
  }

  return {
    retryAfterSec,
    remaining:
      remaining != null && Number.isFinite(remaining) ? remaining : null,
  };
}

// ── Effective delay + acquire ───────────────────────────────────────────────
function effectiveDelay(source: Source, firstSync: boolean): number {
  const p = profile(source);
  const m = multiplier.get(source) ?? MULTIPLIER_MIN;
  const base = p.minDelayMs * m * (firstSync ? p.firstSyncSlowdown : 1);
  const jitter = base * p.jitterFraction * Math.random();
  return Math.round(base + jitter);
}

function pruneLog(source: Source): number[] {
  const p = profile(source);
  const cutoff = now() - p.windowMs;
  const log_ = (requestLog.get(source) ?? []).filter((ts) => ts >= cutoff);
  requestLog.set(source, log_);
  return log_;
}

export interface AcquireOptions {
  signal?: AbortSignal;
  /** Apply the stricter first/full-sync pacing profile. */
  firstSync?: boolean;
  /** Max time to wait before giving up (throws). Default: no limit. */
  maxWaitMs?: number;
}

export class GovernorAbortError extends Error {
  constructor() {
    super("rate governor wait aborted");
    this.name = "GovernorAbortError";
  }
}

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new GovernorAbortError());
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(id);
      reject(new GovernorAbortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Block until it is safe to make a request to `source`, then record it. Honors
 * (in order): kill switch / manual pause / at-risk parking / cooldown / breaker,
 * then per-source minimum spacing and the rolling per-window budget.
 *
 * Throws GovernorAbortError if the signal aborts or maxWaitMs elapses.
 */
export async function acquire(
  source: Source,
  opts: AcquireOptions = {},
): Promise<void> {
  loadState();
  const deadline =
    opts.maxWaitMs != null ? now() + opts.maxWaitMs : Number.MAX_SAFE_INTEGER;

  // 1. Hard pauses (cooldown / breaker / at-risk / manual / all). Loop because
  //    a long pause may be lifted (resumeSource) while we wait.
  for (;;) {
    if (opts.signal?.aborted) throw new GovernorAbortError();
    const until = sourcePausedUntil(source);
    if (until === 0) break;
    if (until >= Number.MAX_SAFE_INTEGER) {
      // Indefinite pause (kill switch / manual / at-risk). Poll so a manual
      // resume can release us, but bail at the caller's deadline.
      const slice = Math.min(2_000, deadline - now());
      if (slice <= 0) throw new GovernorAbortError();
      await wait(slice, opts.signal);
      continue;
    }
    const sleepMs = Math.min(until - now(), deadline - now());
    if (sleepMs <= 0) throw new GovernorAbortError();
    await wait(Math.min(sleepMs, 5_000), opts.signal);
  }

  // 2. Rolling budget: if the window is full, wait for the oldest to age out.
  const p = profile(source);
  for (;;) {
    const log_ = pruneLog(source);
    if (log_.length < p.maxPerWindow) break;
    const oldest = log_[0] ?? now();
    const waitMs = Math.min(oldest + p.windowMs - now(), deadline - now());
    if (waitMs <= 0 && deadline <= now()) throw new GovernorAbortError();
    await wait(Math.max(50, Math.min(waitMs, 5_000)), opts.signal);
  }

  // 3. Minimum spacing since the last request to this source.
  const last = lastRequestAt.get(source) ?? 0;
  const gap = effectiveDelay(source, opts.firstSync ?? false);
  const spacingWait = last + gap - now();
  if (spacingWait > 0) {
    if (now() + spacingWait > deadline) throw new GovernorAbortError();
    await wait(spacingWait, opts.signal);
  }

  // 4. Record the request.
  const t = now();
  lastRequestAt.set(source, t);
  const log_ = requestLog.get(source) ?? [];
  log_.push(t);
  requestLog.set(source, log_);
  schedulePersist();
}

// ── Report ──────────────────────────────────────────────────────────────────
export interface ReportInput {
  ok: boolean;
  status?: number;
  headers?: HeaderBag;
  /** Explicit rate-limit hint when status/headers aren't available in-page. */
  rateLimited?: boolean;
  retryAfterSec?: number;
}

export interface ReportResult {
  /** Cooldown applied as a result, in ms (0 = none). */
  cooldownMs: number;
}

/**
 * Feed the outcome of a request back to the governor so it can adapt. Returns
 * the cooldown it applied (if any) so callers can surface an accurate
 * "resuming at" time.
 */
export function report(source: Source, input: ReportInput): ReportResult {
  loadState();
  const signal = input.headers ? parseRateSignal(input.headers) : null;
  const is429 = input.status === 429;
  const rateLimited = input.rateLimited === true || is429;

  if (rateLimited) {
    const sec =
      input.retryAfterSec ??
      signal?.retryAfterSec ??
      // No server hint: exponential-ish default tied to the current multiplier.
      Math.min(900, 60 * (multiplier.get(source) ?? 1));
    bumpMultiplier(source);
    const ms = Math.max(1_000, sec * 1000);
    setSourceCooldown(source, ms);
    return { cooldownMs: ms };
  }

  // Proactive slow-down when the platform says we're nearly out of budget.
  if (
    signal?.remaining != null &&
    signal.remaining <= 2 &&
    signal.retryAfterSec != null &&
    signal.retryAfterSec > 0
  ) {
    const ms = signal.retryAfterSec * 1000;
    setSourceCooldown(source, ms);
    return { cooldownMs: ms };
  }

  if (input.ok) noteSuccess(source);
  return { cooldownMs: 0 };
}

function bumpMultiplier(source: Source): void {
  const m = multiplier.get(source) ?? MULTIPLIER_MIN;
  multiplier.set(source, Math.min(MULTIPLIER_MAX, m * MULTIPLIER_INCREASE));
}

// ── Snapshot + subscription (for UI) ────────────────────────────────────────
export interface GovernorSnapshot {
  allPaused: boolean;
  paused: PausedState[];
  atRisk: AtRiskState[];
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

export function governorSnapshot(): GovernorSnapshot {
  return {
    allPaused: isAllPaused(),
    paused: snapshotSourceGate(),
    atRisk: [...atRisk.values()],
  };
}

export function subscribeToGovernor(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(): void {
  const snap = governorSnapshot();
  for (const cb of listeners) {
    try {
      cb(snap);
    } catch {
      /* listener errors must not break the governor */
    }
  }
}

/** Flush state to disk (call on app quit). */
export function flushGovernor(): void {
  schedulePersist(true);
}
