import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { Prefs } from "@pond/schema/db";
import log from "electron-log/main.js";
import { z } from "zod";
import { libraryRoot } from "../paths";
import { createAutoImportWorker } from "./auto-import-worker";
import { reviewImportDuplicates } from "./duplicate-import";
import { emitFeedback } from "./feedback";
import { addSavesToFolder } from "./folders";
import { createManualSave } from "./manual-import";
import { getPrefs } from "./prefs";

const ScreenshotIntakeLogSchema = z.object({
  entries: z.array(
    z.object({
      at: z.number(),
      ruleId: z.string(),
      name: z.string(),
      mode: z.enum(["copy", "move"]),
      ok: z.boolean(),
      autoSelect: z.boolean(),
      id: z.string().optional(),
    }),
  ),
});

export type ScreenshotIntakeLog = z.infer<typeof ScreenshotIntakeLogSchema>;
type Rule = Prefs["screenshots"]["intakeRules"][number];

let workers: Awaited<ReturnType<typeof createAutoImportWorker>>[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let generation = 0;
let reportQueue: Promise<void> = Promise.resolve();

function logPath(root = libraryRoot()): string {
  return join(root, "screenshot-intake-log.json");
}

export async function readScreenshotIntakeLog(): Promise<ScreenshotIntakeLog> {
  try {
    return ScreenshotIntakeLogSchema.parse(
      JSON.parse(await readFile(logPath(), "utf8")),
    );
  } catch {
    return { entries: [] };
  }
}

async function record(
  root: string,
  rule: Rule,
  entry: { name: string; ok: boolean; id?: string },
): Promise<void> {
  let history: ScreenshotIntakeLog = { entries: [] };
  try {
    history = ScreenshotIntakeLogSchema.parse(
      JSON.parse(await readFile(logPath(root), "utf8")),
    );
  } catch {}
  history.entries = [
    {
      ...entry,
      at: Date.now(),
      ruleId: rule.id,
      mode: rule.mode,
      autoSelect: rule.autoSelect,
    },
    ...history.entries,
  ].slice(0, 200);
  await mkdir(root, { recursive: true });
  await writeFile(logPath(root), JSON.stringify(history, null, 2));
}

function checkpointName(rule: Rule): string {
  return createHash("sha256").update(rule.id).digest("hex");
}

export async function stopScreenshotIntake(): Promise<void> {
  generation += 1;
  if (timer) clearInterval(timer);
  timer = null;
  const previous = workers;
  workers = [];
  await Promise.all(previous.map((worker) => worker.stop()));
  await reportQueue;
}

export async function startScreenshotIntake(): Promise<void> {
  await stopScreenshotIntake();
  const current = generation;
  const root = resolve(libraryRoot());
  const prefs = await getPrefs();
  const rules = prefs.screenshots.intakeRules.filter(
    (rule) => rule.enabled && rule.path,
  );
  const next: typeof workers = [];
  for (const rule of rules) {
    const directory = resolve(rule.path);
    if (
      directory === root ||
      directory.startsWith(`${root}${sep}`) ||
      root.startsWith(`${directory}${sep}`)
    ) {
      log.warn("[pond screenshot intake] watched folder overlaps the library");
      continue;
    }
    const worker = await createAutoImportWorker({
      directory,
      checkpointPath: join(
        root,
        ".screenshot-intake",
        `${checkpointName(rule)}.json`,
      ),
      mode: rule.mode,
      async ingest(input) {
        if (resolve(libraryRoot()) !== root)
          throw new Error("The import library changed.");
        if (rule.duplicatePolicy === "skip") {
          const duplicate = (await reviewImportDuplicates([input.path]))[0];
          if (duplicate) return { ok: true, id: duplicate.existingId };
        }
        const result = await createManualSave({
          filePaths: [input.path],
          sourceId: input.sourceId.replace(/^auto:/, `screenshot:${rule.id}:`),
          tags: rule.tags,
        });
        if (result.ok && result.id && rule.folderId)
          await addSavesToFolder(rule.folderId, [result.id]);
        return result;
      },
      async report(entry) {
        reportQueue = reportQueue
          .catch(() => {})
          .then(() => record(root, rule, entry));
        await reportQueue;
        if (entry.ok && rule.notifications)
          await emitFeedback("screenshot").catch((error) =>
            log.warn("[pond screenshot intake] feedback failed", error),
          );
      },
    });
    next.push(worker);
  }
  if (current !== generation) {
    await Promise.all(next.map((worker) => worker.stop()));
    return;
  }
  workers = next;
  let scanning = false;
  const tick = async () => {
    if (scanning || current !== generation) return;

    scanning = true;
    try {
      await Promise.all(next.map((worker) => worker.scan()));
    } catch (error) {
      log.warn("[pond screenshot intake] scan failed", error);
    } finally {
      scanning = false;
    }
  };
  await tick();
  if (current === generation) timer = setInterval(() => void tick(), 1000);
}
