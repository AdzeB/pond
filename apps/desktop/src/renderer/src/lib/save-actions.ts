import type { Save as DbSave } from "@pond/schema/db";
import type { useToast } from "@pond/ui";
import { setInspectorOpen } from "@/lib/use-inspector";
import { optimistic } from "@/pool/bootstrap";
import { pool } from "@/pool/pool";
import type { Save } from "@/pool/types";

type Toast = ReturnType<typeof useToast>;

export async function toggleTrash(save: Save, toast: Toast): Promise<void> {
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

export async function trashSave(save: Save, toast: Toast): Promise<void> {
  if (save.deletedAt) return;
  await toggleTrash(save, toast);
}

export async function untrashSave(save: Save, toast: Toast): Promise<void> {
  if (!save.deletedAt) return;
  await toggleTrash(save, toast);
}

export async function copyUrl(url: string, toast: Toast): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ title: "URL copied", type: "success" });
  } catch {
    toast.add({ title: "Couldn't copy URL", type: "error" });
  }
}

export async function copyId(id: string, toast: Toast): Promise<void> {
  try {
    await navigator.clipboard.writeText(id);
    toast.add({ title: "ID copied", type: "success" });
  } catch {
    toast.add({ title: "Couldn't copy ID", type: "error" });
  }
}

export function focusPaneTitle(): void {
  setInspectorOpen(true);
  // Inspector may have just been toggled open; wait a couple of frames
  // for the title to mount before giving up.
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

export function openTagPicker(): void {
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

export async function purgeForever(save: Save, toast: Toast): Promise<void> {
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

export async function openDefaultApp(save: Save): Promise<void> {
  if (save.files.length === 0) return;
  await window.pond.openSaveFile(save.id, save.coverIndex ?? 0);
}

export async function refreshSaveMetadata(
  save: Save,
  toast: Toast,
): Promise<void> {
  if (!save.url) return;
  await window.pond.refreshSave(save.id);
  toast.add({ title: "Refreshing metadata…", type: "success" });
}
