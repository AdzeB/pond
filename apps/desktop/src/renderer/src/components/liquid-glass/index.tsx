// Frosted in-app surface primitive. The real refractive Liquid Glass now lives
// natively (NSGlassEffectView window backing, macOS 26+) — see
// packages/native-glass and src/main/glass.ts. This module only re-exports the
// plain CSS-frosted <Glass> wrapper used by floating chrome.
export { Glass, type GlassVariant } from "./glass";
