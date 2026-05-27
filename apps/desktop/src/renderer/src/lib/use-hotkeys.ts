import { useHotkey } from "@tanstack/react-hotkeys";
import { isChordPending } from "@/components/command-palette/use-chords";

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

export function useFilterHotkey(onActivate: () => void): void {
  useHotkey("F", (e) => {
    if (isChordPending()) return;
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
    onActivate();
  });
}

export function useSearchHotkey(onActivate: () => void): void {
  useHotkey("/", (e) => {
    if (isChordPending()) return;
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
    onActivate();
  });
}
