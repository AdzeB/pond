import type { Save as DbSave } from "@pond/schema/db";
import type { useToast } from "@pond/ui";
import { presentation } from "@/lib/presentation";
import { setInspectorOpen } from "@/lib/shell-state";
import { mergeUniqueTags, tagClipboard } from "@/lib/tag-clipboard";
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

export async function openInNewWindow(save: Save): Promise<void> {
  await window.pond.openSaveWindow(save.id);
}

export async function copyImage(save: Save, toast: Toast): Promise<void> {
  if (save.files.length === 0) return;
  const result = (await window.pond.query("saves.copyImage", {
    id: save.id,
    fileIndex: save.coverIndex ?? 0,
  })) as { ok: true } | { ok: false; reason?: string };
  if (result.ok) {
    toast.add({ title: "Image copied", type: "success" });
  } else {
    toast.add({ title: "Couldn't copy image", type: "error" });
  }
}

export function copyTags(save: Save, toast: Toast): void {
  if (save.tags.length === 0) {
    toast.add({ title: "No tags to copy", type: "error" });
    return;
  }
  tagClipboard.set(save.tags);
  const n = save.tags.length;
  toast.add({
    title: `Copied ${n} tag${n === 1 ? "" : "s"}`,
    type: "success",
  });
}

export async function pasteTags(save: Save, toast: Toast): Promise<void> {
  const buf = tagClipboard.get();
  if (buf.length === 0) {
    toast.add({ title: "No tags in clipboard", type: "error" });
    return;
  }
  const next = mergeUniqueTags(save.tags, buf);
  const added = next.length - save.tags.length;
  if (added === 0) {
    toast.add({ title: "Tags already present", type: "success" });
    return;
  }
  const prev = pool.get(save.id);
  if (!prev) return;
  await optimistic(
    () => {
      pool.upsert({ ...prev, tags: next } as typeof prev);
    },
    () => {
      pool.upsert(prev);
    },
    async () =>
      window.pond.query("tags.setForSave", {
        saveId: save.id,
        tags: next,
      }),
  );
  toast.add({
    title: `Pasted ${added} tag${added === 1 ? "" : "s"}`,
    type: "success",
  });
}

export async function exportFile(save: Save, toast: Toast): Promise<void> {
  if (save.files.length === 0) return;
  const result = (await window.pond.query("saves.exportFile", {
    id: save.id,
    fileIndex: save.coverIndex ?? 0,
  })) as { ok: true; path: string } | { ok: false; reason?: string };
  if (result.ok) {
    toast.add({ title: "Exported", type: "success" });
  } else if (result.reason !== "cancelled") {
    toast.add({ title: "Couldn't export", type: "error" });
  }
}

export function enterPresentation(save: Save): void {
  if (save.files.length === 0) return;
  presentation.open(save.id);
}
