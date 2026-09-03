import { normalizeLabelName } from "@pond/schema/label-name";
import { z } from "zod";
import { prompt } from "@/components/shared/prompt-dialog";
import { asUrlList } from "@/lib/save/url-list";
import { getAppRouter } from "@/lib/ui/app-router";
import { openSave } from "@/lib/ui/save-nav";
import { notify } from "@/lib/ui/toast";
import { folders } from "@/stores/folders";
import { libraryChrome } from "@/stores/library-chrome";
import { sourceFlow } from "@/stores/source-flow";

const SaveResultSchema = z.object({
  ok: z.boolean(),
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
});

function reportSaved(count: number): void {
  notify({
    id: "new-import",
    title: count === 1 ? "Saved to Pond" : `Saved ${count} items to Pond`,
  });
}

export async function runNewAction(action: () => Promise<void>): Promise<void> {
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

export function newFolder(parentId?: string): void {
  prompt({
    title: parentId ? "New Subfolder" : "New Folder",
    confirmLabel: "Create",
    placeholder: "Name",
    onConfirm: (value) =>
      runNewAction(async () => {
        const name = value.trim();
        if (!name) return;
        await window.pond.query("folders.create", {
          name,
          ...(parentId ? { parentId } : {}),
        });
        await folders.refresh();
      }),
  });
}

export function newTag(kind: "tag" | "tag-group"): void {
  prompt({
    title: kind === "tag" ? "New Tag" : "New Tag Group",
    confirmLabel: "Create",
    placeholder: "Name",
    onConfirm: (value) =>
      runNewAction(async () => {
        const name = normalizeLabelName(value);
        if (!name) return;
        const result = (await window.pond.query(
          kind === "tag" ? "tags.create" : "tagGroups.create",
          { name },
        )) as { ok: boolean };
        if (!result.ok)
          throw new Error("Couldn't create the tag. Try another name.");
        notify({
          id: "new-tag",
          title: kind === "tag" ? "Tag created" : "Tag group created",
        });
      }),
  });
}

export function newSource(kind: "connect" | "watch"): void {
  libraryChrome.setNav({ kind: "sources" });
  getAppRouter()?.history.push("/sources");
  sourceFlow.open(kind === "connect" ? "connect-source" : "watch-source");
}

export async function importPaths(kind: "files" | "folders"): Promise<void> {
  const picked = (await window.pond.query("saves.pickImportPaths", {
    kind,
  })) as { paths: string[] };
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

export async function importClipboard(): Promise<void> {
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

export async function importBookmarks(): Promise<void> {
  const result = (await window.pond.query("saves.importBookmarks", {})) as {
    ok: boolean;
    imported: number;
    skipped: number;
  };
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

export async function importPageAssets(url: string): Promise<void> {
  const href = url.trim();
  if (!href) throw new Error("Enter a website link.");
  notify({ id: "new-import", title: "Extracting page assets", timeout: 0 });
  const result = (await window.pond.query("saves.extractPageAssets", {
    url: href,
  })) as { ok: boolean; imported: number; skipped: number; error?: string };
  if (!result.ok && !result.imported) {
    throw new Error("Couldn't extract images from that page. Try again.");
  }
  notify({
    id: "new-import",
    title: result.imported
      ? `Saved ${result.imported} image${result.imported === 1 ? "" : "s"}`
      : "No images large enough",
    timeout: 5000,
  });
}

export async function importEagle(): Promise<void> {
  const picked = (await window.pond.query("saves.pickEagleLibrary", {})) as {
    ok: boolean;
    path: string | null;
  };
  if (!picked.ok || !picked.path) return;
  notify({ id: "new-import", title: "Importing Eagle library", timeout: 0 });
  const result = (await window.pond.query("saves.importEagleLibrary", {
    path: picked.path,
  })) as {
    ok: boolean;
    imported: number;
    skipped: number;
    failed: number;
    error?: string;
  };
  if (!result.ok && !result.imported && !result.skipped) {
    throw new Error(
      result.error === "not_eagle_library"
        ? "That folder doesn't look like an Eagle library."
        : "Couldn't import the Eagle library. Try again.",
    );
  }
  await folders.refresh();
  notify({
    id: "new-import",
    title: result.imported
      ? `Imported ${result.imported} item${result.imported === 1 ? "" : "s"}`
      : "Nothing new to import",
    description: `${result.skipped} skipped, ${result.failed} failed`,
    timeout: 5000,
  });
}

export async function createNote(title: string, note: string): Promise<void> {
  if (!title.trim() && !note.trim())
    throw new Error("Add a title or note first.");
  const result = SaveResultSchema.parse(
    await window.pond.query("saves.createManual", {
      title: title.trim() || null,
      note: note.trim() || null,
    }),
  );
  if (!result.ok || !result.id)
    throw new Error("Couldn't save the note. Try again.");
  reportSaved(1);
  openSave(result.id);
}

export function parseImportLinks(text: string): string[] {
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

export async function importLinks(text: string): Promise<string[]> {
  const urls = parseImportLinks(text);
  const failed: string[] = [];
  for (const url of urls) {
    try {
      const result = SaveResultSchema.parse(
        await window.pond.query("saves.quickAdd", { url }),
      );
      if (!result.ok) failed.push(url);
    } catch {
      failed.push(url);
    }
  }
  if (urls.length > failed.length) reportSaved(urls.length - failed.length);
  return failed;
}
