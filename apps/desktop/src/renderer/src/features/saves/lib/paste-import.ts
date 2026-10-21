import { z } from "zod";
import { asUrlList, filePathsFromText } from "@/features/saves/lib/url-list";
import { importFilesWithDuplicateReview } from "@/features/saves/state/duplicate-import-review";
import { notify } from "@/shared/lib/toast";

export type PasteImport =
  | { kind: "files"; paths: string[] }
  | { kind: "urls"; urls: string[] }
  | { kind: "clipboard" };

const ImportReplySchema = z
  .object({
    ok: z.boolean().catch(false),
    id: z.string().optional().catch(undefined),
    ids: z.array(z.string()).optional().catch(undefined),
  })
  .catch({ ok: false });

function savedTitle(count: number): string {
  return count === 1 ? "Saved to Pond" : `Saved ${count} items to Pond`;
}

function downloadingTitle(count: number): string {
  return count === 1 ? "Downloading" : `Downloading ${count} links`;
}

function filePaths(data: DataTransfer): string[] {
  return Array.from(data.files ?? [])
    .map((file) => {
      try {
        return window.pond.pathForFile(file);
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

/** Reads what a paste or drop would import, without importing it. */
export function pasteImportOf(data: DataTransfer): PasteImport | null {
  const paths = filePaths(data);
  if (paths.length) return { kind: "files", paths };
  const text = data.getData("text/uri-list") || data.getData("text/plain");
  const textPaths = filePathsFromText(text);
  if (textPaths.length) return { kind: "files", paths: textPaths };
  /** Browsers often advertise a `Files` type for copied links; prefer URL text before image import. */
  const urls = asUrlList(text);
  if (urls) return { kind: "urls", urls };
  const types = Array.from(data.types ?? []);
  /** Finder paste often exposes `Files` with an empty FileList; main reads the native pasteboard. */
  if (
    types.includes("Files") ||
    Array.from(data.files ?? []).some((file) =>
      file.type.startsWith("image/"),
    ) ||
    types.some((type) => type.startsWith("image/"))
  )
    return { kind: "clipboard" };
  return null;
}

async function importPlan(plan: PasteImport): Promise<string[]> {
  switch (plan.kind) {
    case "files": {
      const reply = ImportReplySchema.parse(
        await importFilesWithDuplicateReview({ paths: plan.paths }),
      );
      return reply.ok ? (reply.ids ?? []) : [];
    }
    case "urls": {
      const ids: string[] = [];
      for (const url of plan.urls) {
        const reply = ImportReplySchema.parse(
          await window.pond.query("saves.quickAdd", { url }),
        );
        if (reply.ok && reply.id) ids.push(reply.id);
      }
      return ids;
    }
    case "clipboard": {
      const reply = ImportReplySchema.parse(
        await window.pond.query("saves.importClipboard", {}),
      );
      return reply.ok ? (reply.ids ?? []) : [];
    }
  }
}

/** Imports the pasted files, links, or clipboard image as Saves and returns their IDs. */
export async function runPasteImport(plan: PasteImport): Promise<string[]> {
  const ids = await importPlan(plan);
  if (ids.length)
    notify({
      id: "paste-import",
      title:
        plan.kind === "urls"
          ? downloadingTitle(ids.length)
          : savedTitle(ids.length),
    });
  return ids;
}
