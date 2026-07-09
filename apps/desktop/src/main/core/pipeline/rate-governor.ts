import type { Source } from "@pond/schema/db";
import log from "electron-log/main.js";
import {
  AT_RISK_PARK_MS,
  type AtRiskKind,
  allPaused,
  atRisk,
  BREAKER_THRESHOLD,
  BREAKER_TRIP_MS,
  BREAKER_WINDOW_MS,
  breakerCounters,
  breakerUntil,
  cooldownUntil,
  lastRequestAt,
  loadState,
  MULTIPLIER_DECREASE,
  MULTIPLIER_INCREASE,
  MULTIPLIER_MAX,
  MULTIPLIER_MIN,
  manualPaused,
  multiplier,
  now,
  profile,
  requestLog,
  schedulePersist,
} from "./rate-governor-state";
import { type HeaderBag, parseRateSignal } from "./rate-headers";

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
// from here). State + persistence live in `rate-governor-state`.
// ─────────────────────────────────────────────────────────────────────────────

export {
  isAllPaused,
  pauseAll,
  resumeAll,
  snapshotSourceGate,
} from "./rate-governor-state";

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
}

// ── Manual per-source pause override ─────────────────────────────────────────
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

interface AcquireOptions {
  signal?: AbortSignal;
  /** Apply the stricter first/full-sync pacing profile. */
  firstSync?: boolean;
  /** Max time to wait before giving up (throws). Default: no limit. */
  maxWaitMs?: number;
}

class GovernorAbortError extends Error {
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
interface ReportInput {
  ok: boolean;
  status?: number;
  headers?: HeaderBag;
  /** Explicit rate-limit hint when status/headers aren't available in-page. */
  rateLimited?: boolean;
  retryAfterSec?: number;
}

interface ReportResult {
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

/** Flush state to disk (call on app quit). */
export function flushGovernor(): void {
  schedulePersist(true);
}
