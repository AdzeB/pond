import type { Source } from "@pond/schema/db";

/** Series colors come from the theme's chromatic ramps so they track the user's palette; sources get a fixed hue, open-ended dimensions cycle in rank order. */

export const SOURCE_COLORS: Record<Source, string> = {
  twitter: "var(--ds-cyan-9)",
  instagram: "var(--ds-magenta-9)",
  pinterest: "var(--ds-red-9)",
  arena: "var(--ds-gray-9)",
  cosmos: "var(--ds-indigo-9)",
  tiktok: "var(--ds-teal-9)",
  youtube: "var(--ds-ruby-9)",
  reddit: "var(--ds-orange-9)",
  threads: "var(--ds-purple-9)",
  web: "var(--ds-blue-9)",
  local: "var(--ds-gold-9)",
};

export const CYCLE_COLORS = [
  "var(--ds-indigo-9)",
  "var(--ds-orange-9)",
  "var(--ds-teal-9)",
  "var(--ds-magenta-9)",
  "var(--ds-gold-9)",
  "var(--ds-cyan-9)",
  "var(--ds-purple-9)",
];

export const FALLBACK_COLOR = "var(--ds-accent-9)";
export const OTHER_COLOR = "var(--ds-gray-7)";
