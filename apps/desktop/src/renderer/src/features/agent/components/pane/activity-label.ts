import type { AssistantActivity, AssistantToolStep } from "@shared/assistant";

const activities = {
  thinking: "Thinking",
  searching: "Searching your library",
  reading: "Reading Saves",
  writing: "Writing a response",
  preparing: "Preparing changes",
} satisfies Record<AssistantActivity, string>;

const runningLabels = new Map([
  ["Search library", "Searching your library"],
  ["Read Save", "Reading a Save"],
  ["Grep library", "Searching saved text"],
  ["Library overview", "Reading your library overview"],
  ["Read folders", "Reading folders"],
  ["Apply filter", "Applying filters"],
  ["Set overlay", "Updating the view"],
  ["Cite Saves", "Collecting references"],
  ["Open Save", "Opening a Save"],
  ["Find duplicates", "Finding duplicates"],
  ["Describe images", "Examining images"],
  ["Prepare changes for review", "Preparing changes for review"],
  ["Find Pond capabilities", "Finding Pond capabilities"],
  ["Read operation details", "Checking operation details"],
  ["Use Pond", "Using Pond"],
  ["Read operation result", "Reading operation results"],
]);

export function currentActivityLabel(
  activity: AssistantActivity,
  steps: readonly AssistantToolStep[],
) {
  const running = steps.findLast((step) => step.status === "running");
  if (!running)
    return steps.length ? activities.thinking : activities[activity];
  const label = runningLabels.get(running.label) ?? running.label;
  return running.detail ? `${label}: ${running.detail}` : label;
}
