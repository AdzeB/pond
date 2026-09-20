import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saves } from "@pond/schema/db";
import type { ExtensionCookie } from "@pond/schema/session";
import type { Transaction } from "@pond/schema/tx";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { ensureSecureSecretBytes } from "../keychain";
import { readOrCreatePondId } from "../lib/pond-identity";
import { libraryRoot } from "../paths";
import { captureAsset } from "./capture-asset";
import { createCaptureQueue } from "./capture-queue";
import { executeBatch } from "./executor";
import { emitFeedback } from "./feedback";
import { folderIdsForSave } from "./folder-memberships";
import { runLibraryTransfer } from "./library-transfers";
import { createManualSave } from "./manual-import";
import { enqueue } from "./pipeline/enqueue";
import { librarySecurityStatus } from "./security/app-lock-runtime";
import {
  decodeLibraryFile,
  isEncryptedLibraryFile,
} from "./security/library-file-storage";
import { normalizeTagList, prepareTagRegistryUpdates } from "./tags";
import { recordBatchForUndo } from "./undo";
import { hasUserTitle } from "./user-metadata";

const captureCookies = new Map<string, ExtensionCookie[]>();
const CAPTURE_QUEUE_MAGIC = Buffer.from("PONDCAP1", "ascii");

async function captureQueueKey(): Promise<Buffer> {
  return ensureSecureSecretBytes(
    `pond:capture-queue:${readOrCreatePondId(libraryRoot())}`,
    32,
  );
}

async function writeCaptureQueue(path: string, value: string): Promise<void> {
  const key = await captureQueueKey();
  const nonce = randomBytes(12);
  try {
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    await writeFile(
      path,
      Buffer.concat([
        CAPTURE_QUEUE_MAGIC,
        nonce,
        cipher.getAuthTag(),
        ciphertext,
      ]),
      { mode: 0o600 },
    );
  } finally {
    key.fill(0);
  }
}

async function readCaptureQueue(path: string): Promise<string> {
  const stored = await readFile(path);
  if (
    !stored.subarray(0, CAPTURE_QUEUE_MAGIC.length).equals(CAPTURE_QUEUE_MAGIC)
  )
    return isEncryptedLibraryFile(stored)
      ? decodeLibraryFile(path, stored).toString("utf8")
      : stored.toString("utf8");
  const key = await captureQueueKey();
  try {
    const nonce = stored.subarray(8, 20);
    const tag = stored.subarray(20, 36);
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(stored.subarray(36)),
      decipher.final(),
    ]).toString("utf8");
  } finally {
    key.fill(0);
  }
}
export function attachCaptureCookies(
  id: string,
  cookies: ExtensionCookie[],
): void {
  captureCookies.set(id, cookies);
  setTimeout(() => captureCookies.delete(id), 30 * 60_000).unref();
}

export const captures = createCaptureQueue({
  root: libraryRoot,
  canProcess: () => librarySecurityStatus().state !== "locked",
  readStored: readCaptureQueue,
  writeStored: writeCaptureQueue,
  transfer: runLibraryTransfer,
  onComplete: () => emitFeedback("extensionCapture"),
  async process(item, metadata, identity, originUrl, trigger) {
    let id: string;
    let duplicate = false;
    if (item.kind === "asset") {
      const result = await captureAsset({
        url: item.url,
        title: item.title,
        metadata,
        originUrl,
        cookies: captureCookies.get(
          identity.slice(0, identity.lastIndexOf(":")),
        ),
      });
      id = result.id;
      duplicate = result.duplicate;
    } else if (item.kind === "url") {
      const result = await enqueue(item.url, {
        trigger: trigger ?? "capture",
        cookies: captureCookies.get(
          identity.slice(0, identity.lastIndexOf(":")),
        ),
      });
      id = result.id;
      duplicate = !result.created;
    } else {
      const temp =
        item.kind === "image"
          ? await mkdtemp(join(tmpdir(), "pond-capture-"))
          : undefined;
      try {
        let filePath = item.kind === "file" ? item.path : undefined;
        if (item.kind === "image" && temp) {
          const extension = item.dataUrl.startsWith("data:image/png")
            ? "png"
            : item.dataUrl.startsWith("data:image/webp")
              ? "webp"
              : "jpg";
          filePath = join(temp, `capture.${extension}`);
          await writeFile(
            filePath,
            Buffer.from(
              item.dataUrl.slice(item.dataUrl.indexOf(",") + 1),
              "base64",
            ),
          );
        }
        const result = await createManualSave({
          title: metadata.title || item.title,
          note: item.kind === "note" ? item.text : metadata.notes,
          sourceId: `capture:${identity}`,
          url: originUrl,
          filePaths: filePath ? [filePath] : [],
          tags: metadata.tags,
          rating: metadata.rating,
        });
        if (!result.ok || !result.id)
          throw new Error(result.error || "The capture could not be saved.");
        id = result.id;
        duplicate = Boolean(result.skipped);
      } finally {
        if (temp) await rm(temp, { recursive: true, force: true });
      }
    }
    const db = await getDb();
    const row = db.select().from(saves).where(eq(saves.id, id)).get();
    if (!row)
      throw new Error("The captured Save is missing. Retry this capture.");
    const txs: Transaction[] = await prepareTagRegistryUpdates(metadata.tags);
    const update: Extract<Transaction, { kind: "update"; model: "save" }> = {
      kind: "update",
      model: "save",
      id,
      before: { tags: row.tags },
      patch: {
        tags: normalizeTagList([...(row.tags ?? []), ...metadata.tags]),
      },
      meta: { actor: "user", actorReason: "capture:metadata" },
    };
    if (metadata.title || item.title) {
      update.patch.title = metadata.title || item.title;
      update.before.title = row.title;
    }
    if (metadata.title)
      update.titleLock = { before: hasUserTitle(id), after: true };
    if (metadata.notes) {
      update.patch.notes = metadata.notes;
      update.before.notes = row.notes;
    }
    if (metadata.rating !== undefined) {
      update.patch.rating = metadata.rating;
      update.before.rating = row.rating;
    }
    txs.push(update);
    if (metadata.folderIds.length) {
      const before = await folderIdsForSave(id);
      txs.push({
        kind: "update",
        model: "save_folder",
        id,
        patch: { folderIds: [...new Set([...before, ...metadata.folderIds])] },
        before: { folderIds: before },
        meta: { actor: "user", actorReason: "capture:folders" },
      });
    }
    await executeBatch(txs);
    recordBatchForUndo(txs);
    return { id, duplicate };
  },
});
