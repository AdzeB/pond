import { normalizeLabelName } from "@pond/schema/label-name";
import { Dialog } from "@pond/ui";
import type { BlankDocumentKind } from "@shared/blank-documents";
import { z } from "zod";
import { openDuplicateReview } from "@/features/library/state/duplicate-review";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { libraryViewContext } from "@/features/library/state/library-view-context";
import { savedViews } from "@/features/library/state/saved-views";
import { selection } from "@/features/library/state/selection";
import { openSave } from "@/features/saves/lib/save-nav";
import { selectOnlySave } from "@/features/saves/lib/select";
import { asUrlList } from "@/features/saves/lib/url-list";
import { connectFlow } from "@/features/sources/state/connect-flow";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { getAppRouter } from "@/shared/lib/app-router";
import { notify } from "@/shared/lib/toast";

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
  openSave: typeof openSave;
  refreshFolders: () => Promise<void>;
  openSource: (kind: "connect" | "watch") => void;
  selectSave: (id: string) => void;
  currentFolderId: () => string | null;
}

export function createNewActions({
  prompt,
  notify,
  openSave,
  refreshFolders,
  openSource,
  selectSave,
  currentFolderId,
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

  function newSource(kind: "connect" | "watch"): void {
    openSource(kind);
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
        ? `Opened Collect with ${result.queued} ${result.queued === 1 ? "image" : "images"}`
        : "No images large enough",
      timeout: 5000,
    });
  }

  async function importEagle(): Promise<void> {
    const picked = await window.pond.query("saves.pickEagleLibrary", {});
    if (!picked.ok || !picked.path) return;
    notify({ id: "new-import", title: "Importing Eagle library", timeout: 0 });
    const result = await window.pond.query("saves.importEagleLibrary", {
      path: picked.path,
    });
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

  function connectPinterest(): void {
    libraryChrome.setNav({ kind: "sources" });
    getAppRouter()?.history.push("/sources");
    void window.pond.query("accounts.list", {}).then((result) => {
      const connected = (result.accounts ?? [])
        .filter((account) => account.connected)
        .map((account) => account.id);
      connectFlow.start("pinterest", connected);
      sourceFlow.open("connect-wait");
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
    connectPinterest,
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
  connectPinterest,

  importLinks,
} = createNewActions({
  prompt: Dialog.prompt,
  notify,
  openSave,
  refreshFolders: () => folders.refresh(),
  openSource: (kind) => {
    libraryChrome.setNav({ kind: "sources" });
    getAppRouter()?.history.push("/sources");
    sourceFlow.open(kind === "connect" ? "connect-source" : "watch-target");
  },
  selectSave: selectOnlySave,
  currentFolderId: () => {
    const nav = libraryChrome.getState().nav;
    return nav.kind === "folder" ? nav.id : null;
  },
});
