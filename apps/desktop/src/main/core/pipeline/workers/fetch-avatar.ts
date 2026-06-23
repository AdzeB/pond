import log from "electron-log/main.js";
import { fetchAvatarToTxFile } from "../../../lib/blob";
import { persistSave } from "../../persist-save";
import { TransientError } from "../extractors/errors";
import { readSave } from "./apply";

export async function runFetchAvatar(saveId: string): Promise<void> {
  const save = await readSave(saveId);
  if (!save) return;

  const files = save.files ?? [];
  if (files.some((f) => f.kind === "avatar")) {
    log.debug(
      "[pond pipeline:fetch-avatar] avatar already on disk, skipping",
      saveId,
    );
    return;
  }

  const avatarUrl = pickAvatarUrl(save.rawJson);
  if (!avatarUrl) return;

  const outcome = await fetchAvatarToTxFile(avatarUrl);
  if (!("file" in outcome)) {
    // Transient: retry. Permanent (404 / not-an-image): settle as done — a
    // missing avatar is cosmetic and must never fail the save.
    if (outcome.miss === "transient") {
      throw new TransientError(`fetch-avatar: ${avatarUrl} transiently failed`);
    }
    return;
  }
  const tx = outcome.file;

  await persistSave(
    saveId,
    {},
    {
      actorReason: "pipeline:fetch-avatar",
      newFiles: [
        {
          kind: "avatar",
          filename: tx.filename,
          bytes: Buffer.from(tx.bytes),
          sourceUrl: avatarUrl,
          ...(tx.mimeType ? { mimeType: tx.mimeType } : {}),
        },
      ],
    },
  );
  log.info("[pond pipeline:fetch-avatar] wrote", saveId);
}

function pickAvatarUrl(rawJson: unknown): string | null {
  if (!rawJson || typeof rawJson !== "object") return null;
  const v = rawJson as { capture?: { author?: { avatarUrl?: string } } };
  const url = v.capture?.author?.avatarUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
}
