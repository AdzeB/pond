import { useEffect, useRef } from "react";
import type { Command, PaletteCtx } from "./registry/types";

const CHORD_TIMEOUT_MS = 1500;

// Pending state lives at module scope so other shortcut handlers (save
// shortcuts, grid navigation) can defer to an in-flight chord. Without
// this, pressing `r` to complete `g r` (Recents) would also fire the
// single-letter `r` (Refresh) on the focused save.
let pendingChord: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function resetPending(): void {
  pendingChord = null;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

export function isChordPending(): boolean {
  return pendingChord !== null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useChords(commands: Command[], getCtx: () => PaletteCtx): void {
  const cmdsRef = useRef(commands);
  cmdsRef.current = commands;
  const ctxRef = useRef(getCtx);
  ctxRef.current = getCtx;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        resetPending();
        return;
      }
      if (isEditableTarget(e.target)) {
        resetPending();
        return;
      }
      if (e.key === "Escape") {
        resetPending();
        return;
      }

      const key = e.key.toLowerCase();
      const isLetter = /^[a-z]$/.test(key);
      if (!isLetter) {
        resetPending();
        return;
      }

      if (!pendingChord) {
        const couldStart = cmdsRef.current.some(
          (c) => c.chord && c.chord[0]?.toLowerCase() === key,
        );
        if (!couldStart) return;
        pendingChord = key;
        pendingTimer = setTimeout(resetPending, CHORD_TIMEOUT_MS);
        return;
      }

      const sequence = `${pendingChord} ${key}`;
      resetPending();

      const match = cmdsRef.current.find(
        (c) =>
          c.chord &&
          c.chord.length === 2 &&
          c.chord.map((k) => k.toLowerCase()).join(" ") === sequence,
      );
      if (!match) return;

      const ctx = ctxRef.current();
      if (match.when && !match.when(ctx)) return;
      e.preventDefault();
      void match.perform(ctx);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      resetPending();
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}
