import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { Save } from "@pond/schema/db";
import type { Capture } from "@pond/schema/raw";
import type { TxSaveFile } from "@pond/schema/tx";
import { fetchAvatarToTxFile } from "../../../lib/blob";
import { itemFile } from "../../../paths";

export interface InlinedAvatars {
  capture: Capture;
  /** Downloaded this run; persist so fetch_avatar can skip. */
  avatarFile?: TxSaveFile;
  avatarSourceUrl?: string;
}

/** Hidden capture windows often fail Instagram/Threads CDN avatars; embed bytes so the PNG has a real PFP. */
export async function inlineCaptureAvatars(
  capture: Capture,
  save: Save,
): Promise<InlinedAvatars> {
  const next = structuredClone(capture);
  let avatarFile: TxSaveFile | undefined;
  const sourceUrl = next.author?.avatarUrl;

  if (next.author?.avatarUrl) {
    const fromDisk = await readDiskAvatar(save);
    if (fromDisk) {
      next.author.avatarUrl = fromDisk;
    } else {
      const fetched = await urlToDataUrl(next.author.avatarUrl);
      if (fetched) {
        next.author.avatarUrl = fetched.dataUrl;
        avatarFile = fetched.file;
      }
    }
  }

  const quoted = quotedAuthor(next);
  if (quoted?.avatarUrl && !quoted.avatarUrl.startsWith("data:")) {
    const fetched = await urlToDataUrl(quoted.avatarUrl);
    if (fetched) quoted.avatarUrl = fetched.dataUrl;
  }

  return {
    capture: next,
    ...(avatarFile ? { avatarFile } : {}),
    ...(sourceUrl && avatarFile ? { avatarSourceUrl: sourceUrl } : {}),
  };
}

function quotedAuthor(capture: Capture): { avatarUrl?: string } | undefined {
  const extras = capture.extras;
  if (!extras || typeof extras !== "object") return undefined;
  const quoted = extras.quotedTweet as
    | { author?: { avatarUrl?: string } }
    | undefined;
  return quoted?.author;
}

async function readDiskAvatar(save: Save): Promise<string | null> {
  const file = (save.files ?? []).find((f) => f.kind === "avatar");
  if (!file) return null;
  const path = itemFile(save.id, file.path);
  if (!existsSync(path)) return null;
  try {
    const bytes = await readFile(path);
    const mime = file.mimeType || mimeFromExt(extname(file.path));
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function urlToDataUrl(
  url: string,
): Promise<{ dataUrl: string; file: TxSaveFile } | null> {
  if (url.startsWith("data:")) return null;
  const outcome = await fetchAvatarToTxFile(url);
  if (!("file" in outcome)) return null;
  const mime = outcome.file.mimeType ?? "image/jpeg";
  const bytes = Buffer.from(outcome.file.bytes);
  return {
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
    file: outcome.file,
  };
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}
