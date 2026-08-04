import type { SaveFile } from "@pond/schema/db";
import type { RawJson } from "@pond/schema/raw";
import log from "electron-log/main.js";
import { persistSave } from "../../persist-save";
import { type RenderedCard, renderTextCardPng } from "../../render-card";
import { readSave } from "./apply";

const TEXT_COVER_LIGHT_KIND = "text_cover_light";
const TEXT_COVER_DARK_KIND = "text_cover_dark";

/** Bump when capture output changes so stale covers are regenerated. */
const RENDER_TEXT_COVER_VERSION = 1;

const TEXT_COVER_KINDS = new Set([TEXT_COVER_LIGHT_KIND, TEXT_COVER_DARK_KIND]);

function readVersion(rawJson: unknown): number {
  if (!rawJson || typeof rawJson !== "object") return 0;
  const extras = (rawJson as RawJson).capture?.extras as
    | Record<string, unknown>
    | undefined;
  const v = extras?.renderTextCoverVersion;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function textBody(save: {
  description: string | null;
  title: string | null;
}): string {
  const description = save.description?.trim() ?? "";
  if (description) return description;
  return save.title?.trim() ?? "";
}

/** True when the save has prose and no image/video files to show as a cover. */
function needsTextCover(
  save: NonNullable<Awaited<ReturnType<typeof readSave>>>,
): boolean {
  if (!textBody(save)) return false;
  const files = save.files ?? [];
  return !files.some(
    (f) =>
      !TEXT_COVER_KINDS.has(f.kind) &&
      (f.kind === "image" ||
        f.kind === "video" ||
        f.kind === "poster" ||
        f.kind === "cover" ||
        f.mimeType?.startsWith("image/") === true ||
        f.mimeType?.startsWith("video/") === true),
  );
}

async function writeCover(
  saveId: string,
  kind: string,
  filename: string,
  card: RenderedCard,
): Promise<void> {
  await persistSave(
    saveId,
    {},
    {
      actorReason: `pipeline:render-text-cover:${kind}`,
      replaceFilesWithKind: kind as SaveFile["kind"],
      newFiles: [
        {
          kind: kind as SaveFile["kind"],
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

async function stampVersion(saveId: string, rawJson: unknown): Promise<void> {
  const base =
    rawJson && typeof rawJson === "object" ? (rawJson as RawJson) : null;
  const capture = base?.capture ?? null;
  if (!capture) return;
  const extras = {
    ...((capture.extras as Record<string, unknown> | undefined) ?? {}),
    renderTextCoverVersion: RENDER_TEXT_COVER_VERSION,
  };
  await persistSave(
    saveId,
    {
      rawJson: {
        ...base,
        capture: { ...capture, extras },
      },
    },
    { actorReason: "pipeline:render-text-cover:stamp" },
  );
}

/** Rasterizes text-only saves into theme-matched cover PNGs, matching the tweet screenshot path. */
export async function runRenderTextCover(saveId: string): Promise<number> {
  const save = await readSave(saveId);
  if (!save) return 0;
  if (save.source === "twitter") return 0;
  if (!needsTextCover(save)) return 0;

  if (readVersion(save.rawJson) >= RENDER_TEXT_COVER_VERSION) {
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

  const body = textBody(save);
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
  await stampVersion(saveId, save.rawJson);

  log.info("[pond pipeline:render-text-cover] done", { saveId });
  return 2;
}
