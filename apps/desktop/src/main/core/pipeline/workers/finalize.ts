import { type Save, type Task, tasks } from "@pond/schema/db";
import { and, eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../../db";
import { commitSaveIngestEvent } from "../../../lib/wide-event";
import { persistSave } from "../../persist-save";
import { CAPTURE_EXPECTATIONS } from "../specs";
import { readSave } from "./apply";

export class FinalizeIncompleteError extends Error {
  constructor(public readonly missing: string[]) {
    super(`finalize: missing required fields: ${missing.join(", ")}`);
    this.name = "FinalizeIncompleteError";
  }
}

export async function runFinalize(saveId: string): Promise<void> {
  const save = await readSave(saveId);
  if (!save) return;

  const taskRows = await fetchTaskRows(saveId);
  const report = computeCaptureReport(save);

  if (report.required.missing.length > 0) {
    // Re-pend harvest_metadata if it has retries left; otherwise accept the partial capture.
    const harvestRow = taskRows.find((t) => t.op === "harvest_metadata");
    const harvestExhausted =
      !harvestRow ||
      harvestRow.status === "failed" ||
      harvestRow.attempts >= harvestRow.maxAttempts;

    if (!harvestExhausted) {
      const db = await getDb();
      db.update(tasks)
        .set({
          status: "pending",
          nextRunAt: new Date(Date.now() + 60_000),
          lastError: `finalize: missing required fields ${report.required.missing.join(", ")}`,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.saveId, saveId), eq(tasks.op, "harvest_metadata")))
        .run();
      log.warn(
        "[pond pipeline:finalize] incomplete capture, retrying harvest",
        {
          saveId,
          source: save.source,
          missing: report.required.missing,
        },
      );
      throw new FinalizeIncompleteError(report.required.missing);
    }

    log.warn("[pond pipeline:finalize] incomplete capture, accepting as-is", {
      saveId,
      source: save.source,
      missing: report.required.missing,
    });
  }

  if (report.recommended.missing.length > 0) {
    log.info("[pond pipeline:finalize] capture missing recommended fields", {
      saveId,
      missing: report.recommended.missing,
    });
  }

  if (save.mediaType === "image" && (save.dominantColors ?? []).length === 0) {
    const files = save.files ?? [];
    const cover = files[save.coverIndex ?? 0] ?? files[0];
    if (cover) {
      const { extractPalette } = await import("../../../lib/palette");
      const { itemFile } = await import("../../../paths");
      const colors = await extractPalette(itemFile(saveId, cover.path));
      if (colors.length > 0) {
        await persistSave(
          saveId,
          { dominantColors: colors },
          { actorReason: "color:extract" },
        );
      }
    }
  }

  // Authoritative info.json write after color extraction; writeInfo forces it.
  await persistSave(
    saveId,
    {
      status: "complete",
      ingestCompletedAt: new Date(),
    },
    {
      actorReason: "pipeline:finalize",
      writeInfo: true,
    },
  );
  void commitSaveIngestEvent(saveId, { outcome: "complete" });
}

async function fetchTaskRows(saveId: string): Promise<Task[]> {
  const db = await getDb();
  return db.select().from(tasks).where(eq(tasks.saveId, saveId));
}

interface CaptureReport {
  required: { present: string[]; missing: string[] };
  recommended: { present: string[]; missing: string[] };
  score: number;
}

function computeCaptureReport(save: Save): CaptureReport {
  const expectation = CAPTURE_EXPECTATIONS[save.source];
  const view = buildExpectationView(save);

  const required = partition(expectation.required, view);
  const recommended = partition(expectation.recommended, view);
  const total = required.present.length + recommended.present.length;
  const denom = expectation.required.length + expectation.recommended.length;
  const score = denom === 0 ? 1 : total / denom;
  return { required, recommended, score };
}

function partition(
  paths: readonly string[],
  view: Record<string, unknown>,
): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  for (const path of paths) {
    if (hasMeaningfulValue(getPath(view, path))) present.push(path);
    else missing.push(path);
  }
  return { present, missing };
}

function buildExpectationView(save: Save): Record<string, unknown> {
  const row = save as unknown as Record<string, unknown>;
  return {
    ...row,
    capture:
      (save.rawJson as { capture?: unknown } | null)?.capture ?? undefined,
  };
}

function getPath(root: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function hasMeaningfulValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}
