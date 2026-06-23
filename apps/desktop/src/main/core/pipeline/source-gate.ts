// Back-compat shim: the pacing gate is now the persistent `rate-governor`. Old
// callers keep these imports; new code should import the governor directly.
export {
  noteSuccess,
  noteTransientFailure,
  type PausedReason,
  type PausedState,
  setSourceCooldown,
  snapshotSourceGate,
  sourcePausedUntil,
} from "./rate-governor";
