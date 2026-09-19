import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { dialog } from "electron";
import mime from "mime-types";
import {
  ASSISTANT_FILE_ATTACH_CAP,
  type AssistantFileAttachment,
} from "../../../shared/assistant";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

interface RegisteredAttachment extends AssistantFileAttachment {
  path: string;
}

export interface LocalAttachmentData extends AssistantFileAttachment {
  data: Buffer;
}

const registered = new Map<string, RegisteredAttachment>();

export async function pickLocalAttachments(): Promise<
  | { ok: true; files: AssistantFileAttachment[] }
  | { ok: false; files: []; error: string }
> {
  const picked = await dialog.showOpenDialog({
    title: "Attach Files",
    buttonLabel: "Attach",
    properties: ["openFile", "multiSelections"],
  });
  if (picked.canceled || picked.filePaths.length === 0)
    return { ok: true, files: [] };
  if (picked.filePaths.length > ASSISTANT_FILE_ATTACH_CAP) {
    return {
      ok: false,
      files: [],
      error: `You can attach up to ${ASSISTANT_FILE_ATTACH_CAP} files per message.`,
    };
  }

  const files: AssistantFileAttachment[] = [];
  let totalSize = 0;
  for (const path of picked.filePaths) {
    const details = await stat(path);
    if (!details.isFile() || details.size === 0)
      return {
        ok: false,
        files: [],
        error: "Choose non-empty files, then try again.",
      };
    if (details.size > MAX_FILE_BYTES)
      return {
        ok: false,
        files: [],
        error: "Each attachment must be 25 MB or smaller.",
      };
    totalSize += details.size;
    if (totalSize > MAX_TOTAL_BYTES)
      return {
        ok: false,
        files: [],
        error: "Attachments can total up to 50 MB per message.",
      };
    const file: RegisteredAttachment = {
      id: randomUUID(),
      name: basename(path),
      mediaType: mime.lookup(path) || "application/octet-stream",
      size: details.size,
      path,
    };
    registered.set(file.id, file);
    files.push({
      id: file.id,
      name: file.name,
      mediaType: file.mediaType,
      size: file.size,
    });
  }
  return { ok: true, files };
}

export async function loadLocalAttachments(
  ids: readonly string[],
): Promise<LocalAttachmentData[]> {
  const unique = [...new Set(ids)].slice(0, ASSISTANT_FILE_ATTACH_CAP);
  const files = unique.map((id) => registered.get(id));
  if (files.some((file) => !file))
    throw new Error(
      "An attached file is no longer available. Attach it again.",
    );
  const available = files as RegisteredAttachment[];
  const loaded: LocalAttachmentData[] = [];
  let totalSize = 0;
  for (const file of available) {
    const data = await readFile(file.path);
    if (data.byteLength > MAX_FILE_BYTES)
      throw new Error("Each attachment must be 25 MB or smaller.");
    totalSize += data.byteLength;
    if (totalSize > MAX_TOTAL_BYTES)
      throw new Error("Attachments can total up to 50 MB per message.");
    loaded.push({
      id: file.id,
      name: file.name,
      mediaType: file.mediaType,
      size: data.byteLength,
      data,
    });
  }
  return loaded;
}
