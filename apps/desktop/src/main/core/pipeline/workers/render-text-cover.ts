import type { SaveFile, Source } from "@pond/schema/db";
import type { Capture, RawJson } from "@pond/schema/raw";
import {
  RENDER_TEXT_COVER_VERSION,
  TEXT_COVER_DARK_KIND,
  TEXT_COVER_KINDS,
  TEXT_COVER_LIGHT_KIND,
  textBodyFromFields,
  textCoverVersionFromRawJson,
} from "@shared/text-card";
import log from "electron-log/main.js";
import { persistSave } from "../../persist-save";
import { type RenderedCard, renderTextCardPng } from "../../render-card";
import { readSave } from "./apply";

function needsTextCover(
  save: NonNullable<Awaited<ReturnType<typeof readSave>>>,
): boolean {
  const hasProse =
    Boolean(save.description?.trim()) || save.mediaType === "text";
  if (!hasProse) return false;
  if (!textBodyFromFields(save.description, save.title)) return false;
  const files = save.files ?? [];
  return !files.some(
    (f) =>
      !TEXT_COVER_KINDS.has(f.kind) &&
      (f.kind === "image" ||
        f.kind === "video" ||
        f.kind === "poster" ||
        f.kind === "cover" ||
        f.kind === "media" ||
        f.mimeType?.startsWith("image/") === true ||
        f.mimeType?.startsWith("video/") === true),
  );
}

async function writeCover(
  saveId: string,
  kind: SaveFile["kind"],
  filename: string,
  card: RenderedCard,
): Promise<void> {
  await persistSave(
    saveId,
    {},
    {
      actorReason: `pipeline:render-text-cover:${kind}`,
      replaceFilesWithKind: kind,
      newFiles: [
        {
          kind,
          filename,
          bytes: card.bytes,
          mimeType: "image/png",
          width: card.width,
          height: card.height,
        },
      ],
    },
  );
}

function stubCapture(
  save: NonNullable<Awaited<ReturnType<typeof readSave>>>,
): Capture {
  return {
    id: save.sourceId || save.id,
    source: save.source as Source,
    url: save.url,
    media: [],
  };
}

async function stampVersion(
  save: NonNullable<Awaited<ReturnType<typeof readSave>>>,
): Promise<void> {
  const base =
    save.rawJson && typeof save.rawJson === "object"
      ? (save.rawJson as RawJson)
      : null;
  const capture = base?.capture ?? stubCapture(save);
  const extras = {
    ...((capture.extras as Record<string, unknown> | undefined) ?? {}),
    renderTextCoverVersion: RENDER_TEXT_COVER_VERSION,
  };
  const rawJson: RawJson = {
    capture: { ...capture, extras },
    extractorId: base?.extractorId ?? "text-cover",
    extractedAt: base?.extractedAt ?? new Date().toISOString(),
    ...(base?.ytdlp ? { ytdlp: base.ytdlp } : {}),
  };
  await persistSave(
    save.id,
    { rawJson },
    { actorReason: "pipeline:render-text-cover:stamp" },
  );
}

/** Rasterizes text-only saves into theme-matched cover PNGs, matching the tweet screenshot path. */
export async function runRenderTextCover(
  saveId: string,
  opts: { force?: boolean } = {},
): Promise<number> {
  const save = await readSave(saveId);
  if (!save) return 0;
  if (save.source === "twitter") return 0;
  if (!needsTextCover(save)) return 0;

  if (
    !opts.force &&
    textCoverVersionFromRawJson(save.rawJson) >= RENDER_TEXT_COVER_VERSION
  ) {
    const hasBoth =
      (save.files ?? []).some((f) => f.kind === TEXT_COVER_LIGHT_KIND) &&
      (save.files ?? []).some((f) => f.kind === TEXT_COVER_DARK_KIND);
    if (hasBoth) {
      log.debug(
        "[pond pipeline:render-text-cover] up to date, skipping",
        saveId,
      );
      return 0;
    }
  }

  const body = textBodyFromFields(save.description, save.title);
  const light = await renderTextCardPng(body, "light");
  if (!light) return 0;
  const dark = await renderTextCardPng(body, "dark");
  if (!dark) return 0;

  await writeCover(
    saveId,
    TEXT_COVER_LIGHT_KIND,
    "text-cover-light.png",
    light,
  );
  await writeCover(saveId, TEXT_COVER_DARK_KIND, "text-cover-dark.png", dark);
  await stampVersion(save);

  log.info("[pond pipeline:render-text-cover] done", { saveId });
  return 2;
}
