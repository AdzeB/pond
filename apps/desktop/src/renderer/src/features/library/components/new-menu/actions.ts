import type { Source } from "@pond/schema/db";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Dialog } from "@pond/ui";
import type { BlankDocumentKind } from "@shared/blank-documents";
import type { EagleImportProgress } from "@shared/saves-import-contracts";
import { z } from "zod";
import { openDuplicateReview } from "@/features/library/state/duplicate-review";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { savedViews } from "@/features/library/state/saved-views";
import { openSave } from "@/features/saves/lib/save-nav";
import { selectOnlySave } from "@/features/saves/lib/select";
import { asUrlList } from "@/features/saves/lib/url-list";
import { selection } from "@/features/saves/state/selection";
import { libraryViewContext } from "@/features/saves/state/view-context";
import { startConnect, startWatch } from "@/features/sources/lib/create";
import { getAppRouter } from "@/shared/lib/app-router";
import { notify, updateNotification } from "@/shared/lib/toast";

interface CreateFolderInput {
  name: string;
  parentId?: string;
}

const SaveResultSchema = z.object({
  ok: z.boolean(),
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
});

export interface NewActionServices {
  prompt: typeof Dialog.prompt;
  notify: typeof notify;
  updateNotification: typeof updateNotification;
  openSave: typeof openSave;
  refreshFolders: () => Promise<void>;
  openSource: (kind: "connect" | "watch", source: Source) => void;
  selectSave: (id: string) => void;
  currentFolderId: () => string | null;
  onEagleImportProgress: (
    callback: (progress: EagleImportProgress) => void,
  ) => () => void;
}

export function createNewActions({
  prompt,
  notify,
  updateNotification,
  openSave,
  refreshFolders,
  openSource,
  selectSave,
  currentFolderId,
  onEagleImportProgress,
}: NewActionServices) {
  function reportSaved(count: number): void {
    notify({
      id: "new-import",
      title: count === 1 ? "Saved to Pond" : `Saved ${count} items to Pond`,
    });
  }

  function reportDownloading(count: number): void {
    notify({
      id: "new-import",
      title: count === 1 ? "Downloading" : `Downloading ${count} links`,
    });
  }

  async function runNewAction(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      notify({
        id: "new-import",
        title: "Couldn't complete action",
        description: error instanceof Error ? error.message : "Try again.",
        timeout: 5000,
      });
    }
  }

  function newFolder(parentId?: string): void {
    prompt({
      title: parentId ? "New Subfolder" : "New Folder",
      confirmLabel: "Create",
      placeholder: "Name",
      onConfirm: (value) =>
        runNewAction(async () => {
          const name = value.trim();
          if (!name) return;
          const input: CreateFolderInput = { name };
          if (parentId) input.parentId = parentId;
          await window.pond.query("folders.create", input);
          await refreshFolders();
        }),
    });
  }

  function newTag(kind: "tag" | "tag-group"): void {
    prompt({
      title: kind === "tag" ? "New Tag" : "New Tag Group",
      confirmLabel: "Create",
      placeholder: "Name",
      onConfirm: (value) =>
        runNewAction(async () => {
          const name = normalizeLabelName(value);
          if (!name) return;
          const result = await window.pond.query(
            kind === "tag" ? "tags.create" : "tagGroups.create",
            { name },
          );
          if (!result.ok)
            throw new Error("Couldn't create the tag. Try another name.");
          notify({
            id: "new-tag",
            title: kind === "tag" ? "Tag created" : "Tag group created",
          });
        }),
    });
  }

  function newSource(kind: "connect" | "watch", source: Source): void {
    openSource(kind, source);
  }

  async function importPaths(kind: "files" | "folders"): Promise<void> {
    const picked = await window.pond.query("saves.pickImportPaths", {
      kind,
    });
    if (picked.paths.length === 0) return;
    const result = SaveResultSchema.parse(
      await window.pond.query("saves.importFiles", { paths: picked.paths }),
    );
    if (!result.ok || !result.ids?.length) {
      throw new Error(
        "No files were imported. Choose readable, non-empty files.",
      );
    }
    reportSaved(result.ids.length);
  }

  async function importClipboard(): Promise<void> {
    const result = SaveResultSchema.parse(
      await window.pond.query("saves.importClipboard", {}),
    );
    if (!result.ok || !result.ids?.length) {
      throw new Error(
        "Copy an image or files first. Use Import from Links for URLs.",
      );
    }
    reportSaved(result.ids.length);
  }

  async function importBookmarks(): Promise<void> {
    const result = await window.pond.query("saves.importBookmarks", {});
    if (!result.ok && result.imported === 0) {
      if (result.skipped === 0) return;
      throw new Error("Couldn't import those bookmarks. Try another file.");
    }
    notify({
      id: "new-import",
      title: result.imported
        ? `Imported ${result.imported} bookmark${result.imported === 1 ? "" : "s"}`
        : "Nothing new to import",
      description: result.skipped > 0 ? `${result.skipped} skipped` : undefined,
      timeout: 5000,
    });
  }

  async function importPageAssets(url: string): Promise<void> {
    const href = url.trim();
    if (!href) throw new Error("Enter a website link.");
    notify({ id: "new-import", title: "Extracting page assets", timeout: 0 });
    const result = await window.pond.query("saves.extractPageAssets", {
      url: href,
    });
    if (!result.ok && !result.queued && !result.imported) {
      throw new Error("Couldn't extract images from that page. Try again.");
    }
    notify({
      id: "new-import",
      title: result.queued
        ? `Queued ${result.queued} ${result.queued === 1 ? "image" : "images"}`
        : "No images large enough",
      timeout: 5000,
    });
  }

  async function importEagle(): Promise<void> {
    const picked = await window.pond.query("saves.pickEagleLibrary", {});
    if (!picked.ok || !picked.path) return;
    const progressId = crypto.randomUUID();
    const unsubscribe = onEagleImportProgress((progress) => {
      if (progress.id !== progressId) return;
      const hasItems = progress.total > 0;
      updateNotification({
        id: "new-import",
        title: "Importing Eagle library",
        description: hasItems
          ? `${progress.processed} of ${progress.total} item${progress.total === 1 ? "" : "s"}`
          : "Checking library",
        progress: {
          label: "Eagle library import progress",
          detail: `${progress.imported} imported · ${progress.skipped} skipped · ${progress.failed} failed`,
          value: hasItems ? progress.processed : undefined,
          max: hasItems ? progress.total : undefined,
        },
        timeout: 0,
      });
    });
    notify({
      id: "new-import",
      title: "Importing Eagle library",
      description: "Preparing library",
      progress: { label: "Eagle library import progress" },
      timeout: 0,
    });
    const result = await window.pond
      .query("saves.importEagleLibrary", {
        path: picked.path,
        progressId,
      })
      .finally(unsubscribe);
    if (!result.ok && !result.imported && !result.skipped) {
      throw new Error(
        result.error === "not_eagle_library"
          ? "That folder doesn't look like an Eagle library."
          : "Couldn't import the Eagle library. Try again.",
      );
    }
    await refreshFolders();
    notify({
      id: "new-import",
      title: result.imported
        ? `Imported ${result.imported} item${result.imported === 1 ? "" : "s"}`
        : "Nothing new to import",
      description: `${result.skipped} skipped, ${result.failed} failed`,
      timeout: 5000,
    });
  }

  async function importPondPackage(): Promise<void> {
    const result = await window.pond.query("saves.importPackage", {});
    if (!result.ok) {
      if (result.error === "canceled") return;
      throw new Error(
        result.error || "Couldn't import the package. Try again.",
      );
    }
    await refreshFolders();
    notify({
      id: "new-import",
      title: result.imported
        ? `Imported ${result.imported} Save${result.imported === 1 ? "" : "s"}`
        : "Nothing new to import",
      description: result.skipped ? `${result.skipped} skipped` : undefined,
      timeout: 5000,
    });
  }

  async function createNote(): Promise<void> {
    const result = SaveResultSchema.parse(
      await window.pond.query("saves.createManual", {
        title: null,
        note: null,
        mediaType: "text",
      }),
    );
    if (!result.ok || !result.id)
      throw new Error("Couldn't save the note. Try again.");
    await placeCreatedSave(result.id);
  }

  async function createBlankDocument(kind: BlankDocumentKind): Promise<void> {
    const result = SaveResultSchema.parse(
      await window.pond.query("saves.createBlankDocument", {
        kind,
        folderId: currentFolderId(),
      }),
    );
    if (!result.ok || !result.id)
      throw new Error("Couldn't create the document. Try again.");
    selectSave(result.id);
  }

  async function placeCreatedSave(id: string): Promise<void> {
    const folderId = currentFolderId();
    if (folderId) {
      await window.pond.query("folders.addSaves", {
        folderId,
        saveIds: [id],
      });
    }
    selectSave(id);
  }

  function newSmartFolder(): void {
    prompt({
      title: "New Smart Folder",
      confirmLabel: "Create",
      initialValue: "Untitled",
      onConfirm: (value) =>
        runNewAction(async () => {
          const name = value.trim() || "Untitled";
          await savedViews.create({ name, kind: "smart_folder" });
        }),
    });
  }

  function findDuplicates(scope: "all" | "list" | "selected"): void {
    if (scope === "all") {
      openDuplicateReview({});
      return;
    }
    if (scope === "list") {
      openDuplicateReview({ ids: [...libraryViewContext.filteredIds()] });
      return;
    }
    const ids = selection.snapshot();
    if (ids.length === 0) {
      notify({
        id: "new-import",
        title: "Select Saves first",
        description: "Choose items in the library, then scan selected.",
      });
      return;
    }
    openDuplicateReview({ ids: [...ids] });
  }

  async function rescanLibrary(): Promise<void> {
    notify({ id: "new-import", title: "Rescanning library", timeout: 0 });
    const result = await window.pond.query("library.rescan", {});
    notify({
      id: "new-import",
      title:
        result.updated === 0
          ? "Library is up to date"
          : `Updated ${result.updated} of ${result.total} saves`,
    });
  }

  async function verifyIntegrity(): Promise<void> {
    notify({ id: "new-import", title: "Verifying library", timeout: 0 });
    const result = await window.pond.query("library.verifyIntegrity", {});
    if (!result.ok) {
      throw new Error(
        result.reason && result.reason !== "internal_error"
          ? result.reason
          : "Couldn't verify the library. Try again.",
      );
    }
    const missing = result.missing?.length ?? 0;
    const orphans = result.orphans?.length ?? 0;
    const errorCount = Object.keys(result.errors ?? {}).length;
    if (missing === 0 && orphans === 0 && errorCount === 0) {
      notify({ id: "new-import", title: "Library looks healthy" });
      return;
    }
    const happened: string[] = [];
    if (missing === 1) happened.push("1 save is missing from disk");
    else if (missing > 1) {
      happened.push(`${missing} saves are missing from disk`);
    }
    if (orphans === 1) happened.push("1 file isn't in the index");
    else if (orphans > 1) {
      happened.push(`${orphans} files aren't in the index`);
    }
    if (errorCount > 0 && happened.length === 0) {
      happened.push("Couldn't verify every file");
    }
    notify({
      id: "new-import",
      title: happened.join(". "),
      description:
        result.errors?.library ??
        "Reveal the Library in Finder to check, or rescan.",
      timeout: 5000,
    });
  }

  function parseImportLinks(text: string): string[] {
    const urls = asUrlList(text);
    if (
      !urls ||
      urls.some((value) => {
        try {
          const url = new URL(value);
          return !url.hostname || !["https:", "http:"].includes(url.protocol);
        } catch {
          return true;
        }
      })
    )
      throw new Error("Enter valid website links, one per line.");
    return [...new Set(urls)];
  }

  async function importLinks(text: string): Promise<string[]> {
    const urls = parseImportLinks(text);
    const failed: string[] = [];
    const added: Array<string | null> = [];
    for (const url of urls) {
      try {
        const result = SaveResultSchema.parse(
          await window.pond.query("saves.quickAdd", { url }),
        );
        if (!result.ok) failed.push(url);
        else added.push(result.id ?? null);
      } catch {
        failed.push(url);
      }
    }
    if (added.length > 0) reportDownloading(added.length);
    const id = added.length === 1 ? added[0] : null;
    if (id) openSave(id);
    return failed;
  }

  return {
    runNewAction,
    newFolder,
    newTag,
    newSource,
    importPaths,
    importClipboard,
    importBookmarks,
    importPageAssets,
    importEagle,
    importPondPackage,
    createNote,
    createBlankDocument,
    newSmartFolder,
    findDuplicates,
    rescanLibrary,
    verifyIntegrity,
    parseImportLinks,
    importLinks,
  };
}

export const {
  runNewAction,
  newFolder,
  newTag,
  newSource,
  importPaths,
  importClipboard,
  importBookmarks,
  importPageAssets,
  importEagle,
  importPondPackage,
  createNote,
  createBlankDocument,
  newSmartFolder,
  findDuplicates,
  rescanLibrary,
  verifyIntegrity,

  importLinks,
} = createNewActions({
  prompt: Dialog.prompt,
  notify,
  updateNotification,
  openSave,
  refreshFolders: () => folders.refresh(),
  openSource: (kind, source) => {
    libraryChrome.setNav({ kind: "sources" });
    getAppRouter()?.history.push("/sources");
    if (kind === "connect") void startConnect(source);
    else startWatch(source);
  },
  selectSave: selectOnlySave,
  currentFolderId: () => {
    const nav = libraryChrome.getState().nav;
    return nav.kind === "folder" ? nav.id : null;
  },
  onEagleImportProgress: (callback) =>
    window.pond.onEagleImportProgress(callback),
});
