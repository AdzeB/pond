import { existsSync } from "node:fs";
import {
  type NewSave,
  type Save,
  saves as savesTable,
  type VideoNote,
} from "@pond/schema/db";
import { eq, isNotNull, or, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../db";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { itemFile } from "../paths";

/** Per-item sidecar (items/<id>.info/enrichment.json) persisting pipeline outputs that would otherwise live only in the disposable index DB; embedding vectors stay index-only because they are large and cheap to recompute. */

const SIDECAR_FILE = "enrichment.json";

const ENRICHMENT_KEYS = [
  "phash",
  "caption",
  "captionModel",
  "ocrText",
  "ocrModel",
  "transcript",
  "transcriptModel",
  "aesthetic",
  "aestheticModel",
  "autoTitleModel",
  "suggestedTags",
  "suggestedTagsModel",
  "videoNotes",
  "dominantColors",
] as const satisfies readonly (keyof Save)[];

type EnrichmentKey = (typeof ENRICHMENT_KEYS)[number];
export type EnrichmentFields = Partial<Pick<Save, EnrichmentKey>>;

export function patchTouchesEnrichment(patch: Partial<NewSave>): boolean {
  return ENRICHMENT_KEYS.some((key) => patch[key] !== undefined);
}

function sidecarPath(id: string): string {
  return itemFile(id, SIDECAR_FILE);
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.length > 0;
  return true;
}

/** Skips the write when there is nothing to persist and no stale file to refresh. */
export function writeEnrichmentSidecar(save: Save): void {
  const data: Record<string, unknown> = {};
  let any = false;
  for (const key of ENRICHMENT_KEYS) {
    const value = save[key];
    if (!hasValue(value)) continue;
    data[key] = value;
    any = true;
  }
  const file = sidecarPath(save.id);
  if (!any && !existsSync(file)) return;
  try {
    writeBundleJson(file, data);
  } catch (err) {
    log.warn("[pond enrichment] sidecar write failed", save.id, err);
  }
}

export function readEnrichmentSidecar(id: string): EnrichmentFields | null {
  const file = sidecarPath(id);
  if (!existsSync(file)) return null;
  const read = readBundleJson<Record<string, unknown>>(file);
  if (!read || typeof read.data !== "object" || read.data === null) return null;

  const out: Record<string, unknown> = {};
  const raw = read.data;
  copyString(raw, out, "phash");
  copyString(raw, out, "caption");
  copyString(raw, out, "captionModel");
  copyString(raw, out, "ocrText");
  copyString(raw, out, "ocrModel");
  copyString(raw, out, "transcript");
  copyString(raw, out, "transcriptModel");
  copyStringArray(raw, out, "aesthetic");
  copyString(raw, out, "aestheticModel");
  copyString(raw, out, "autoTitleModel");
  copyStringArray(raw, out, "suggestedTags");
  copyString(raw, out, "suggestedTagsModel");
  copyVideoNotes(raw, out);
  copyStringArray(raw, out, "dominantColors");
  return Object.keys(out).length > 0 ? (out as EnrichmentFields) : null;
}

function copyString(
  raw: Record<string, unknown>,
  out: Record<string, unknown>,
  key: string,
): void {
  if (typeof raw[key] === "string" && raw[key].length > 0) out[key] = raw[key];
}

function copyStringArray(
  raw: Record<string, unknown>,
  out: Record<string, unknown>,
  key: string,
): void {
  const value = raw[key];
  if (!Array.isArray(value)) return;
  const items = value.filter((v): v is string => typeof v === "string");
  if (items.length > 0) out[key] = items;
}

function copyVideoNotes(
  raw: Record<string, unknown>,
  out: Record<string, unknown>,
): void {
  const value = raw.videoNotes;
  if (!Array.isArray(value)) return;
  const notes = value.filter(
    (n): n is VideoNote =>
      n != null &&
      typeof n === "object" &&
      typeof (n as VideoNote).id === "string" &&
      typeof (n as VideoNote).timeSec === "number" &&
      typeof (n as VideoNote).text === "string",
  );
  if (notes.length > 0) out.videoNotes = notes;
}

/** Writes missing sidecars for already-enriched rows so existing libraries converge without a blocking migration. */
export async function backfillEnrichmentSidecars(): Promise<void> {
  const db = await getDb();
  const enriched = await db
    .select({ id: savesTable.id })
    .from(savesTable)
    .where(
      or(
        isNotNull(savesTable.phash),
        isNotNull(savesTable.caption),
        isNotNull(savesTable.ocrText),
        isNotNull(savesTable.transcript),
        isNotNull(savesTable.aesthetic),
        isNotNull(savesTable.autoTitleModel),
        isNotNull(savesTable.suggestedTags),
        /** Array columns default to '[]' (never null); check length instead. */
        sql`json_array_length(${savesTable.videoNotes}) > 0`,
        sql`json_array_length(${savesTable.dominantColors}) > 0`,
      ),
    );

  const missing = enriched
    .map((r) => r.id)
    .filter((id) => !existsSync(sidecarPath(id)));
  if (missing.length === 0) return;

  let written = 0;
  for (const id of missing) {
    const rows = await db
      .select()
      .from(savesTable)
      .where(eq(savesTable.id, id));
    const save = rows[0];
    if (!save) continue;
    writeEnrichmentSidecar(save);
    written += 1;
  }
  log.info(`[pond enrichment] backfilled ${written} sidecars`);
}
