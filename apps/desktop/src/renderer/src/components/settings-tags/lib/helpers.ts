import { relativeTimeFromMs } from "@/lib/util/relative-time";

// Named swatches a user can assign to a group. Values are theme tokens so they
// adapt to light/dark automatically.
export const GROUP_COLORS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Red", value: "var(--ds-red-9)" },
  { label: "Orange", value: "var(--ds-orange-9)" },
  { label: "Amber", value: "var(--ds-amber-9)" },
  { label: "Green", value: "var(--ds-green-9)" },
  { label: "Teal", value: "var(--ds-teal-9)" },
  { label: "Blue", value: "var(--ds-blue-9)" },
  { label: "Violet", value: "var(--ds-violet-9)" },
  { label: "Pink", value: "var(--ds-pink-9)" },
];

// Deterministic dot color hashed from a label name. Tags don't store a color;
// the hash gives every tag a stable, distinct dot for free.
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1)
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 55%)`;
}

// Stable callback ref that focuses (and selects) an input on mount — used for
// inline create/rename so we get autofocus behaviour without the lint.
export function focusInput(el: HTMLInputElement | null): void {
  if (!el) return;
  el.focus();
  el.select();
}

export function relativeTime(ms: number | null): string {
  return relativeTimeFromMs(ms, "—");
}

// Short absolute date ("Jul 2025") for the Created column.
const MONTH_YEAR = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

export function shortDate(ms: number | null): string {
  if (ms == null) return "—";
  return MONTH_YEAR.format(new Date(ms));
}
