import { useToast } from "@pond/ui";
import { useEffect } from "react";
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
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const id = primarySelection.get();
      if (!id) return;
      const save = pool.get(id);
      if (!save) return;

      const key = e.key;

      if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        void toggleTrash(save, toast);
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
