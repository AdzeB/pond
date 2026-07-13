import {
  trashSave as applyTrash,
  untrashSave as applyUntrash,
  purgeSave,
  setSaveTags,
} from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { pool } from "@/stores/pool";
import { mergeUniqueTags, tagClipboard } from "@/stores/tag-clipboard";

async function toggleTrash(save: Save): Promise<void> {
  const prev = pool.get(save.id);
  if (!prev) return;
  const wasTrashed = Boolean(prev.deletedAt);
  if (wasTrashed) await applyUntrash(save.id);
  else await applyTrash(save.id);
}

export async function trashSave(save: Save): Promise<void> {
  if (save.deletedAt) return;
  await toggleTrash(save);
}

export async function untrashSave(save: Save): Promise<void> {
  if (!save.deletedAt) return;
  await toggleTrash(save);
}

export async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    /** Clipboard unavailable; drop silently. */
  }
}

export async function copyId(id: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(id);
  } catch {
    /** Clipboard unavailable; drop silently. */
  }
}

export function focusPaneTitle(): void {
  /** Drawer is already open; wait a couple of frames for the title to mount before giving up. */
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

export async function purgeForever(save: Save): Promise<void> {
  await purgeSave(save.id);
}

export async function openDefaultApp(save: Save): Promise<void> {
  if (save.files.length === 0) return;
  await window.pond.openSaveFile(save.id, save.coverIndex ?? 0);
}

export async function revealFile(save: Save): Promise<void> {
  if (save.files.length === 0) return;
  await window.pond.revealSave(save.id, save.coverIndex ?? 0);
}

export async function copyFilePath(save: Save): Promise<void> {
  const result = (await window.pond.query("saves.filePath", {
    id: save.id,
    fileIndex: save.coverIndex ?? 0,
  })) as { ok: true; path: string } | { ok: false; reason: string };
  if (!result.ok) return;
  try {
    await navigator.clipboard.writeText(result.path);
  } catch {
    /** Clipboard unavailable; drop silently. */
  }
}

export async function copyFile(save: Save): Promise<void> {
  if (save.files.length === 0) return;
  await window.pond.query("saves.copyFile", {
    id: save.id,
    fileIndex: save.coverIndex ?? 0,
  });
}

export async function openInBrowser(save: Save): Promise<void> {
  if (!save.url) return;
  try {
    const parsed = new URL(save.url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      await window.pond.openExternal(parsed.toString());
    }
  } catch {
    /** Malformed URL; drop silently. */
  }
}

export async function refreshSaveMetadata(save: Save): Promise<void> {
  if (!save.url) return;
  await window.pond.refreshSave(save.id);
}

export async function copyImage(save: Save): Promise<void> {
  if (save.files.length === 0) return;
  await window.pond.query("saves.copyImage", {
    id: save.id,
    fileIndex: save.coverIndex ?? 0,
  });
}

export function copyTags(save: Save): void {
  if (save.tags.length === 0) return;
  tagClipboard.set(save.tags);
}

export async function pasteTags(save: Save): Promise<void> {
  const buf = tagClipboard.get();
  if (buf.length === 0) return;
  const next = mergeUniqueTags(save.tags, buf);
  const added = next.length - save.tags.length;
  if (added === 0) return;
  await setSaveTags(save.id, next);
}

export async function exportFile(save: Save): Promise<void> {
  if (save.files.length === 0) return;
  await window.pond.query("saves.exportFile", {
    id: save.id,
    fileIndex: save.coverIndex ?? 0,
  });
}
