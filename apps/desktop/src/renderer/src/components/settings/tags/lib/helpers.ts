import { colorForName } from "@/lib/tags/color";
import { relativeTimeFromMs } from "@/lib/util/relative-time";

export { colorForName };

/** Values are theme tokens so they adapt to light/dark automatically. */
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

/** Callback ref that focuses and selects on mount, giving autofocus behaviour without the lint. */
export function focusInput(el: HTMLInputElement | null): void {
  if (!el) return;
  el.focus();
  el.select();
}

export function relativeTime(ms: number | null): string {
  return relativeTimeFromMs(ms, "—");
}

const MONTH_YEAR = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

export function shortDate(ms: number | null): string {
  if (ms == null) return "—";
  return MONTH_YEAR.format(new Date(ms));
}
