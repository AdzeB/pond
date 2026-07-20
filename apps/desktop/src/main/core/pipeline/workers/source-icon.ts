/** Downloads a web save's favicon once and persists it as the source badge image. */
import type { Save } from "@pond/schema/db";
import log from "electron-log/main.js";
import { fetchSourceIconToTxFile } from "../../../lib/blob";
import { persistSave } from "../../persist-save";

/** Mirrored as a literal in the renderer's media/url.ts; the renderer can't import the main bundle. */
const SOURCE_ICON_KIND = "source_icon";

export function hasSourceIcon(files: Save["files"]): boolean {
  return (files ?? []).some((f) => f.kind === SOURCE_ICON_KIND);
}

/** Returns true when an icon file was written; false when one already exists or none could be fetched. */
export async function fetchSourceIcon(
  saveId: string,
  save: Save,
): Promise<boolean> {
  if (hasSourceIcon(save.files)) return false;

  const iconUrl = pickFaviconUrl(save);
  if (!iconUrl) return false;

  const outcome = await fetchSourceIconToTxFile(iconUrl);
  if (!("file" in outcome)) return false;
  const tx = outcome.file;

  await persistSave(
    saveId,
    {},
    {
      actorReason: "pipeline:source-icon",
      newFiles: [
        {
          kind: SOURCE_ICON_KIND,
          filename: tx.filename,
          bytes: Buffer.from(tx.bytes),
          sourceUrl: iconUrl,
          ...(tx.mimeType ? { mimeType: tx.mimeType } : {}),
        },
      ],
    },
  );
  log.info("[pond pipeline:source-icon] wrote", saveId);
  return true;
}

function pickFaviconUrl(save: Save): string | null {
  return scrapedFaviconUrl(save.rawJson) ?? fallbackFaviconUrl(save.url);
}

function scrapedFaviconUrl(rawJson: unknown): string | null {
  if (!rawJson || typeof rawJson !== "object") return null;
  const v = rawJson as {
    capture?: { extras?: { faviconUrl?: unknown } };
  };
  const url = v.capture?.extras?.faviconUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Google's favicon service resolves any domain to a PNG, covering saves harvested before favicon capture existed. */
function fallbackFaviconUrl(saveUrl: string): string | null {
  try {
    const host = new URL(saveUrl).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return null;
  }
}
