import type { JsonObject } from "@pond/schema/json";
import { z } from "zod";
import type { AssistantToolStep } from "../../../shared/assistant";
import { sourceExcerpt } from "../../../shared/assistant-text";
import type { ToolSpec } from "./complete";

const labels = new Map<string, string>(
  Object.entries({
    searchLibrary: "Search library",
    readSave: "Read Save",
    grepLibrary: "Grep library",
    libraryOverview: "Library overview",
    listFolders: "Read folders",
    applyFilter: "Apply filter",
    setOverlay: "Set overlay",
    citeSaves: "Cite Saves",
    openSave: "Open Save",
    findDuplicates: "Find duplicates",
    describeSaves: "Describe images",
    proposeChanges: "Prepare changes for review",
  }),
);

export function trackTools(
  tools: ToolSpec[],
  signal: AbortSignal,
  onSteps?: (steps: AssistantToolStep[]) => void,
) {
  let steps: AssistantToolStep[] = [];
  const update = (id: string, value: Partial<AssistantToolStep>) => {
    steps = steps.map((step) =>
      step.id === id ? { ...step, ...value } : step,
    );
    onSteps?.(steps);
  };
  return {
    steps: () => steps,
    tools: tools.map((tool) => {
      const label = labels.get(tool.name);
      if (!label) return tool;
      return {
        ...tool,
        execute: async (args: JsonObject) => {
          signal.throwIfAborted();
          const id = `step-${steps.length + 1}`;
          const started = Date.now();
          steps = [
            ...steps,
            {
              id,
              label,
              detail:
                tool.name === "searchLibrary"
                  ? sourceExcerpt(
                      z.string().catch("Recent Saves").parse(args.query),
                      150,
                    )
                  : undefined,
              status: "running",
            },
          ];
          onSteps?.(steps);
          try {
            const result = await tool.execute(args);
            signal.throwIfAborted();
            update(id, {
              status: "complete",
              elapsedMs: Date.now() - started,
            });
            return result;
          } catch (error) {
            update(id, {
              status: signal.aborted ? "stopped" : "error",
              elapsedMs: Date.now() - started,
            });
            throw error;
          }
        },
      };
    }),
  };
}
