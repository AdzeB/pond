import type { Save as DbSave } from "@pond/schema/db";
import type { Command } from "./types";

export const SAVE_CONTEXT_COMMANDS: Command[] = [
  {
    id: "save.open-detail",
    label: "Open in detail view",
    group: "Save",
    scope: "saves",
    keywords: ["open", "detail", "view"],
    when: (ctx) => !!ctx.focusedSaveId,
    perform: ({ navigate, focusedSaveId, close }) => {
      if (!focusedSaveId) return;
      navigate(`/detail/${focusedSaveId}`, { viewTransition: true });
      close();
    },
  },
  {
    id: "save.reveal",
    label: "Reveal in Finder",
    group: "Save",
    scope: "saves",
    keywords: ["reveal", "finder", "explorer", "open"],
    when: (ctx) => !!ctx.focusedSaveId,
    perform: async ({ pond, focusedSaveId, close }) => {
      if (!focusedSaveId) return;
      close();
      await pond.revealSave(focusedSaveId);
    },
  },
  {
    id: "save.open-with-default",
    label: "Open with default app",
    group: "Save",
    scope: "saves",
    keywords: ["open", "default"],
    when: (ctx) => !!ctx.focusedSaveId,
    perform: async ({ pond, focusedSaveId, close }) => {
      if (!focusedSaveId) return;
      close();
      await pond.openSaveFile(focusedSaveId);
    },
  },
  {
    id: "save.copy-url",
    label: "Copy URL",
    group: "Save",
    scope: "saves",
    keywords: ["copy", "url", "link"],
    when: (ctx) => !!ctx.focusedSave?.url,
    perform: async ({ focusedSave, toast, close }) => {
      if (!focusedSave?.url) return;
      await navigator.clipboard.writeText(focusedSave.url);
      toast.success("URL copied");
      close();
    },
  },
  {
    id: "save.open-original",
    label: "Open original URL",
    description: "Open the source page in your browser",
    group: "Save",
    scope: "saves",
    keywords: ["open", "url", "external", "browser"],
    when: (ctx) => !!ctx.focusedSave?.url,
    perform: async ({ pond, focusedSave, close }) => {
      if (!focusedSave?.url) return;
      close();
      await pond.openExternal(focusedSave.url);
    },
  },
  {
    id: "save.refresh",
    label: "Refresh metadata",
    group: "Save",
    scope: "saves",
    keywords: ["refresh", "metadata", "rescrape"],
    when: (ctx) => !!ctx.focusedSaveId,
    perform: async ({ pond, focusedSaveId, toast, close }) => {
      if (!focusedSaveId) return;
      close();
      const r = await pond.refreshSave(focusedSaveId);
      if (r.ok) toast.success("Metadata refreshed");
      else toast.warn(`Refresh failed: ${r.reason.replace("_", " ")}`);
    },
  },
  {
    id: "save.trash",
    label: "Move to Trash",
    group: "Save",
    scope: "saves",
    keywords: ["trash", "delete", "remove"],
    shortcut: ["⌫"],
    when: (ctx) => !!ctx.focusedSaveId && !ctx.focusedSave?.deletedAt,
    perform: async ({ pond, focusedSaveId, toast, close }) => {
      if (!focusedSaveId) return;
      close();
      await pond.tx({ kind: "trash", model: "save", id: focusedSaveId });
      toast.success("Moved to trash");
    },
  },
  {
    id: "save.untrash",
    label: "Restore from Trash",
    group: "Save",
    scope: "saves",
    keywords: ["restore", "untrash", "recover"],
    shortcut: ["⌫"],
    when: (ctx) => !!ctx.focusedSave?.deletedAt,
    perform: async ({ pond, focusedSaveId, toast, close }) => {
      if (!focusedSaveId) return;
      close();
      await pond.tx({ kind: "untrash", model: "save", id: focusedSaveId });
      toast.success("Restored");
    },
  },
  {
    id: "save.delete-forever",
    label: "Delete forever",
    description: "Removes from disk and database with no recovery",
    group: "Save",
    scope: "saves",
    keywords: ["delete", "purge", "forever", "permanent"],
    when: (ctx) => !!ctx.focusedSave?.deletedAt,
    perform: async ({ pond, focusedSave, toast, close }) => {
      if (!focusedSave) return;
      close();
      // `purge` needs a snapshot for undo. The palette only fires
      // this when focusedSave is trashed, so the local row matches
      // what's on disk.
      await pond.tx({
        kind: "purge",
        model: "save",
        id: focusedSave.id,
        before: focusedSave as unknown as DbSave,
      });
      toast.success("Deleted forever");
    },
  },
  {
    id: "save.bulk-trash",
    label: "Move selected to Trash",
    group: "Save",
    scope: "saves",
    keywords: ["trash", "delete", "bulk", "selection"],
    when: (ctx) => ctx.selectionSize > 1,
    perform: async ({ pond, selectedIds, selectionSize, toast, close }) => {
      if (selectedIds.length === 0) return;
      close();
      await pond.batch(
        selectedIds.map((id) => ({
          kind: "trash",
          model: "save",
          id,
          meta: { actor: "user", actorReason: "palette-bulk-trash" },
        })),
      );
      toast.success(
        `Moved ${selectionSize} save${selectionSize === 1 ? "" : "s"} to trash`,
      );
    },
  },
  {
    id: "save.bulk-refresh",
    label: "Refresh selected saves",
    group: "Save",
    scope: "saves",
    keywords: ["refresh", "metadata", "bulk", "selection"],
    when: (ctx) => ctx.selectionSize > 1,
    perform: async ({ pond, selectedIds, selectionSize, toast, close }) => {
      if (selectedIds.length === 0) return;
      close();
      let ok = 0;
      for (const id of selectedIds) {
        const r = await pond.refreshSave(id);
        if (r.ok) ok++;
      }
      toast.success(`Refreshed ${ok}/${selectionSize} saves`);
    },
  },
];
