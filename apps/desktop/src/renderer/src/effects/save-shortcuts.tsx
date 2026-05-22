import type { Save as DbSave } from "@pond/schema/db";
import { useToast } from "@pond/ui";
import { useEffect } from "react";
import { isChordPending } from "@/components/command-palette/use-chords";
import { setInspectorOpen } from "@/lib/use-inspector";
import { optimistic } from "@/pool/bootstrap";
import { pool } from "@/pool/pool";
import { primarySelection } from "@/pool/selection";
import type { Save } from "@/pool/types";

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

      // Cmd+Backspace → delete forever (matches Linear's "Delete issue").
      if (
        (e.metaKey || e.ctrlKey) &&
        (key === "Backspace" || key === "Delete")
      ) {
        e.preventDefault();
        void purgeForever(save, toast);
        return;
      }

      // Cmd+Shift+, → copy URL (Linear: copy issue URL).
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === ",") {
        if (!save.url) return;
        e.preventDefault();
        void copyUrl(save.url, toast);
        return;
      }

      // Cmd+. → copy id (Linear: copy issue id).
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === ".") {
        e.preventDefault();
        void copyId(save.id, toast);
        return;
      }

      // No other modifier-combos handled here; the rest are bare letters.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Defer to chord matcher when `g`, `n`, etc. is pending — otherwise
      // the second key of a chord (`g r` → Recents) would also fire the
      // single-letter `r` (Refresh) on the focused save.
      if (isChordPending()) return;

      if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        void toggleTrash(save, toast);
        return;
      }

      // Shift+R → rename (Linear: rename issue). Opens the inspector if
      // it's hidden, then focuses the title h2 on the next frame so the
      // contentEditable has actually mounted.
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
          void window.pond.openSaveFile(save.id, save.coverIndex ?? 0);
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
          void window.pond.refreshSave(save.id);
          toast.add({ title: "Refreshing metadata…", type: "success" });
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

async function toggleTrash(
  save: Save,
  toast: ReturnType<typeof useToast>,
): Promise<void> {
  const prev = pool.get(save.id);
  if (!prev) return;
  const wasTrashed = Boolean(prev.deletedAt);
  await optimistic(
    () => {
      pool.upsert({
        ...prev,
        deletedAt: wasTrashed ? null : Date.now(),
      } as typeof prev);
    },
    () => {
      pool.upsert(prev);
    },
    async () =>
      window.pond.tx({
        kind: wasTrashed ? "untrash" : "trash",
        model: "save",
        id: save.id,
      }),
  );
  toast.add({
    title: wasTrashed ? "Restored" : "Moved to trash",
    type: "success",
  });
}

async function copyUrl(
  url: string,
  toast: ReturnType<typeof useToast>,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ title: "URL copied", type: "success" });
  } catch {
    toast.add({ title: "Couldn't copy URL", type: "error" });
  }
}

async function copyId(
  id: string,
  toast: ReturnType<typeof useToast>,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(id);
    toast.add({ title: "ID copied", type: "success" });
  } catch {
    toast.add({ title: "Couldn't copy ID", type: "error" });
  }
}

function focusPaneTitle(): void {
  setInspectorOpen(true);
  // Inspector might still be mounting if the user just toggled it open;
  // poll a couple of frames before giving up so the title is ready.
  let tries = 0;
  const tick = () => {
    const el = document.querySelector<HTMLElement>("[data-pane-title]");
    if (el) {
      el.focus();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }
    if (tries++ < 4) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function openTagPicker(): void {
  setInspectorOpen(true);
  let tries = 0;
  const tick = () => {
    const el = document.querySelector<HTMLButtonElement>("[data-tag-add]");
    if (el) {
      el.click();
      return;
    }
    if (tries++ < 4) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function purgeForever(
  save: Save,
  toast: ReturnType<typeof useToast>,
): Promise<void> {
  const prev = pool.get(save.id);
  if (!prev) return;
  await optimistic(
    () => {
      pool.delete(save.id);
    },
    () => {
      pool.upsert(prev);
    },
    async () =>
      window.pond.tx({
        kind: "purge",
        model: "save",
        id: save.id,
        before: prev as unknown as DbSave,
      }),
  );
  toast.add({ title: "Deleted forever", type: "success" });
}
