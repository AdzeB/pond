import type { ChatMiddleware } from "@tanstack/ai";
import { z } from "zod";
import type { AssistantToolStep } from "../../../shared/assistant";
import { sourceExcerpt } from "../../../shared/assistant-text";

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

export function createToolTracker(
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
  const finishPending = () => {
    steps = steps.map((step) =>
      step.status === "running"
        ? { ...step, status: signal.aborted ? "stopped" : "error" }
        : step,
    );
    onSteps?.(steps);
  };
  const middleware: ChatMiddleware = {
    name: "pond-tool-activity",
    onBeforeToolCall(_context, info) {
      signal.throwIfAborted();
      const label = labels.get(info.toolName);
      if (!label) return;
      const args = z
        .object({ query: z.string().catch("Recent Saves") })
        .catch({ query: "Recent Saves" })
        .parse(info.args);
      steps = [
        ...steps,
        {
          id: info.toolCallId,
          label,
          detail:
            info.toolName === "searchLibrary"
              ? sourceExcerpt(args.query, 150)
              : undefined,
          status: "running",
        },
      ];
      onSteps?.(steps);
    },
    onAfterToolCall(_context, info) {
      update(info.toolCallId, {
        status: signal.aborted ? "stopped" : info.ok ? "complete" : "error",
        elapsedMs: info.duration,
      });
    },
    onFinish: finishPending,
    onAbort: finishPending,
    onError: finishPending,
  };
  return { steps: () => steps, middleware };
}
