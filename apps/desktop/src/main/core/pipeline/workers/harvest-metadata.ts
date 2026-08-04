import type { NewSave } from "@pond/schema/db";
import { domainFromUrl } from "@pond/schema/domain";
import { majorityMediaType } from "@pond/schema/media-type";
import log from "electron-log/main.js";
import { persistSave } from "../../persist-save";
import { resolveExtractor } from "../extractors";
import type { Capture, RawJson } from "../extractors/types";
import { readSave } from "./apply";

const HARVEST_FRESH_MS = 24 * 60 * 60 * 1000;

interface HarvestPayload {
  force?: boolean;
}

export async function runHarvestMetadata(
  saveId: string,
  payload: HarvestPayload = {},
): Promise<void> {
  const save = await readSave(saveId);
  if (!save) return;

  if (!payload.force && isFreshHarvest(save.rawJson)) {
    log.debug(
      "[pond pipeline:harvest] fresh capture present, skipping",
      saveId,
    );
    return;
  }

  const extractor = resolveExtractor(save.url);
  const url = new URL(save.url);
  const capture = await extractor.extract({ url });

  const existingRaw =
    save.rawJson && typeof save.rawJson === "object"
      ? (save.rawJson as RawJson)
      : null;

  const rawJson: RawJson = {
    capture,
    extractorId: extractor.id,
    extractedAt: new Date().toISOString(),
    ...(existingRaw?.ytdlp ? { ytdlp: existingRaw.ytdlp } : {}),
  };

  const patch = buildSavePatch(capture, rawJson, save.url);
  await persistSave(saveId, patch, {
    actorReason: `harvest:${extractor.id}`,
  });
  log.info("[pond pipeline:harvest] captured", {
    saveId,
    extractor: extractor.id,
    media: capture.media.length,
  });
}

function isFreshHarvest(rawJson: unknown): boolean {
  if (!rawJson || typeof rawJson !== "object") return false;
  const v = rawJson as { extractedAt?: unknown; capture?: unknown };
  if (typeof v.extractedAt !== "string" || !v.capture) return false;
  const ms = Date.parse(v.extractedAt);
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms < HARVEST_FRESH_MS;
}

function buildSavePatch(
  capture: Capture,
  rawJson: RawJson,
  pageUrl: string,
): Partial<NewSave> {
  const mediaUrl = capture.media[0]?.url ?? null;
  const mediaType = pickMediaType(capture);

  const patch: Partial<NewSave> = {
    rawJson,
    title: capture.title ?? null,
    description: capture.description ?? null,
    author: capture.author?.name ?? capture.author?.handle ?? null,
    lang: capture.lang ?? null,
    publishedAt: capture.publishedAt ? safeDate(capture.publishedAt) : null,
    mediaUrl,
    mediaType,
    siteName: domainFromUrl(pageUrl),
  };
  return patch;
}

function safeDate(value: string): Date | null {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function pickMediaType(capture: Capture) {
  return majorityMediaType(
    (capture.media ?? []).map((m) => (m.type === "video" ? "video" : "image")),
  );
}
