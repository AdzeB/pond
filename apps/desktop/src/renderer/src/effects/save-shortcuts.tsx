import { useToast } from "@pond/ui";
import { useEffect } from "react";
import { isChordPending } from "@/components/command-palette/use-chords";
import {
  copyId,
  copyUrl,
  focusPaneTitle,
  openDefaultApp,
  openTagPicker,
  purgeForever,
  refreshSaveMetadata,
  toggleTrash,
} from "@/lib/save-actions";
import { pool } from "@/pool/pool";
import { primarySelection } from "@/pool/selection";

// Linear's playbook: when one issue is focused, unmodified letter keys
// fire the most-used action without ever leaving the keyboard. The
// "focused save" here is whatever `useSavesData` mirrored into
// `primarySelection` from the URL `:id` param, so the inspector save is
// always the one being acted on.
//
// Multi-select keeps using `BulkActionBar`; this effect is a no-op when
// a key would be ambiguous (no primary, modifier held, typing in input).

const TEXT_INPUT_TAGS: ReadonlySet<string> = new Set(["INPUT", "TEXTAREA"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (TEXT_INPUT_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function SaveShortcuts() {
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const id = primarySelection.get();
      if (!id) return;
      const save = pool.get(id);
      if (!save) return;

      const key = e.key;

      if (
        (e.metaKey || e.ctrlKey) &&
        (key === "Backspace" || key === "Delete")
      ) {
        e.preventDefault();
        void purgeForever(save, toast);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === ",") {
        if (!save.url) return;
        e.preventDefault();
        void copyUrl(save.url, toast);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === ".") {
        e.preventDefault();
        void copyId(save.id, toast);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Defer to the chord matcher mid-sequence so `g r` (Recents)
      // doesn't double-fire `r` (Refresh) on the focused save.
      if (isChordPending()) return;

      if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        void toggleTrash(save, toast);
        return;
      }

      if (e.shiftKey && key.toLowerCase() === "r") {
        e.preventDefault();
        focusPaneTitle();
        return;
      }

      if (e.shiftKey) return;

      const lowered = key.length === 1 ? key.toLowerCase() : key;
      switch (lowered) {
        case "o": {
          if (save.files.length === 0) return;
          e.preventDefault();
          void openDefaultApp(save);
          return;
        }
        case "c": {
          if (!save.url) return;
          e.preventDefault();
          void copyUrl(save.url, toast);
          return;
        }
        case "r": {
          if (!save.url) return;
          e.preventDefault();
          void refreshSaveMetadata(save, toast);
          return;
        }
        case "t": {
          e.preventDefault();
          openTagPicker();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toast]);

  return null;
}
