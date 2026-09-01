import type { AssistantToolStep } from "../../../shared/assistant";
import { sourceExcerpt } from "../../../shared/assistant-text";
import type { ToolSpec } from "./complete";

const labels: Record<string, string> = {
  searchLibrary: "Search library",
  readSave: "Read Save",
  listFolders: "Read folders",
  proposeChanges: "Prepare changes for review",
};

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
      const label = labels[tool.name];
      if (!label) return tool;
      return {
        ...tool,
        execute: async (args: Record<string, unknown>) => {
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
                  ? typeof args.query === "string"
                    ? sourceExcerpt(args.query, 150)
                    : "Recent Saves"
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
