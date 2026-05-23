import { useEffect, useRef } from "react";
import { isChordPending } from "@/components/command-palette/use-chords";

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

export function useFilterHotkey(onActivate: () => void): void {
  const cb = useRef(onActivate);
  cb.current = onActivate;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== "f") return;
      if (isChordPending()) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      cb.current();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}

export function useSearchHotkey(onActivate: () => void): void {
  const cb = useRef(onActivate);
  cb.current = onActivate;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "/") return;
      if (isChordPending()) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      cb.current();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
