/** Review-only switch for comparing alternative takes of a move, set with `?variant=` on the stage page. */

export const VARIANTS = [
  "camera-punch",
  "camera-follow",
  "camera-spotlight",
  "words-carousel",
  "words-roll",
  "words-single",
  "icons-save",
  "icons-sync",
  "icons-ask",
  "cta-url",
  "cta-button",
  "cta-qr",
  "burst-save",
  "burst-find",
  "burst-ask",
] as const;

export type Variant = (typeof VARIANTS)[number];

const requested = new URLSearchParams(location.search).get("variant");

export const VARIANT: Variant | null =
  VARIANTS.find((id) => id === requested) ?? null;

export const is = (id: Variant) => VARIANT === id;
