import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  type ConversionJob,
  type ConversionPreset,
  ConversionPresetSchema,
} from "../../shared/conversion-contracts";
import { resolveSaveFilePath } from "../ipc/helpers";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { resolvePaths } from "../paths";
import { convertMedia } from "./convert-media";

export function conversionPresets(
  root = resolvePaths().libraryRoot,
): ConversionPreset[] {
  const file = join(root, "conversion-presets.json");
  const stored = readBundleJson<ConversionPreset[]>(file);
  if (!stored) {
    if (existsSync(file))
      throw new Error("Conversion presets could not be read.");
    return [];
  }
  return z.array(ConversionPresetSchema).parse(stored.data);
}
export function saveConversionPreset(
  preset: ConversionPreset,
): ConversionPreset {
  const parsed = ConversionPresetSchema.parse(preset);
  const presets = conversionPresets().filter((item) => item.id !== parsed.id);
  writeBundleJson(join(resolvePaths().libraryRoot, "conversion-presets.json"), [
    ...presets,
    parsed,
  ]);
  return parsed;
}
export function deleteConversionPreset(id: string): void {
  writeBundleJson(
    join(resolvePaths().libraryRoot, "conversion-presets.json"),
    conversionPresets().filter((item) => item.id !== id),
  );
}

interface ConversionRuntime {
  scope(): string;
  resolve(id: string, fileIndex: number): Promise<string>;
  convert: typeof convertMedia;
}
const runtime: ConversionRuntime = {
  scope: () => resolvePaths().libraryRoot,
  async resolve(id, fileIndex) {
    const target = await resolveSaveFilePath(id, fileIndex);
    if (!target.ok) throw new Error(`No file is available for save ${id}.`);
    return target.path;
  },
  convert: convertMedia,
};
export function createConversionJobs(operations: ConversionRuntime) {
  const jobs = new Map<
    string,
    { value: ConversionJob; controller: AbortController }
  >();
  return {
    start(input: {
      ids: readonly string[];
      fileIndex: number;
      preset: ConversionPreset;
      directory: string;
    }): ConversionJob {
      if (
        [...jobs.values()].filter((job) => job.value.status === "running")
          .length >= 2
      )
        throw new Error(
          "Two exports are already running. Wait or cancel one before starting another.",
        );
      const scope = operations.scope();
      const ids = [...new Set(input.ids)];
      const value: ConversionJob = {
        id: crypto.randomUUID(),
        status: "running",
        completed: 0,
        total: ids.length,
        directory: input.directory,
        outputs: [],
        error: null,
      };
      const controller = new AbortController();
      jobs.set(value.id, { value, controller });
      for (const [id, job] of jobs) {
        if (jobs.size <= 20) break;
        if (job.value.status !== "running") jobs.delete(id);
      }
      void (async () => {
        try {
          for (const id of ids) {
            controller.signal.throwIfAborted();
            if (operations.scope() !== scope)
              throw new Error(
                "The active library changed. Start the export again.",
              );
            const source = await operations.resolve(id, input.fileIndex);
            if (operations.scope() !== scope)
              throw new Error(
                "The active library changed. Start the export again.",
              );
            const output = await operations.convert({
              source,
              directory: input.directory,
              preset: input.preset,
              signal: controller.signal,
            });
            value.outputs.push(output);
            value.completed += 1;
          }
          value.status = controller.signal.aborted ? "cancelled" : "complete";
        } catch (error) {
          value.status = controller.signal.aborted ? "cancelled" : "failed";
          value.error =
            error instanceof Error ? error.message : "Conversion failed.";
        }
      })();
      return structuredClone(value);
    },
    status(id: string): ConversionJob | null {
      const job = jobs.get(id);
      return job ? structuredClone(job.value) : null;
    },
    cancel(id: string): ConversionJob | null {
      const job = jobs.get(id);
      if (job?.value.status === "running") job.controller.abort();
      return this.status(id);
    },
  };
}
export const conversionJobs = createConversionJobs(runtime);
