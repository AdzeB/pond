import {
  type AssistantActivity,
  type AssistantToolStep,
  ASSISTANT_ACTIVITY_LABELS as activities,
} from "@shared/assistant";

export type ActivityIcon =
  | "search"
  | "read"
  | "folder"
  | "filter"
  | "view"
  | "cite"
  | "open"
  | "duplicate"
  | "image"
  | "review"
  | "explore"
  | "operation";

interface StepCopy {
  live: string;
  done: string;
  many?: (count: number) => string;
  icon: ActivityIcon;
}

const copy = new Map<string, StepCopy>([
  [
    "Search library",
    {
      live: "Searching your library",
      done: "Searched your library",
      icon: "search",
    },
  ],
  [
    "Read Save",
    {
      live: "Reading a Save",
      done: "Read a Save",
      many: (count) => `Read ${count} Saves`,
      icon: "read",
    },
  ],
  [
    "Grep library",
    {
      live: "Searching saved text",
      done: "Searched saved text",
      icon: "search",
    },
  ],
  [
    "Library overview",
    {
      live: "Reading your library overview",
      done: "Read your library overview",
      icon: "read",
    },
  ],
  [
    "Read folders",
    { live: "Reading folders", done: "Read your folders", icon: "folder" },
  ],
  [
    "Apply filter",
    { live: "Applying filters", done: "Applied filters", icon: "filter" },
  ],
  [
    "Set overlay",
    { live: "Updating the view", done: "Updated the view", icon: "view" },
  ],
  [
    "Cite Saves",
    {
      live: "Collecting references",
      done: "Collected references",
      icon: "cite",
    },
  ],
  [
    "Open Save",
    { live: "Opening a Save", done: "Opened a Save", icon: "open" },
  ],
  [
    "Find duplicates",
    {
      live: "Finding duplicates",
      done: "Looked for duplicates",
      icon: "duplicate",
    },
  ],
  [
    "Describe images",
    {
      live: "Examining images",
      done: "Examined images",
      icon: "image",
    },
  ],
  [
    "Prepare changes for review",
    {
      live: "Preparing changes for review",
      done: "Prepared changes for review",
      icon: "review",
    },
  ],
  [
    "Find Pond capabilities",
    {
      live: "Finding Pond capabilities",
      done: "Checked what Pond can do",
      icon: "explore",
    },
  ],
  [
    "Read operation details",
    {
      live: "Checking operation details",
      done: "Checked operation details",
      icon: "operation",
    },
  ],
  ["Use Pond", { live: "Using Pond", done: "Used Pond", icon: "operation" }],
  [
    "Read operation result",
    {
      live: "Reading operation results",
      done: "Read the results",
      icon: "operation",
    },
  ],
]);

export function currentActivityLabel(
  activity: AssistantActivity,
  steps: readonly AssistantToolStep[],
) {
  const running = steps.findLast((step) => step.status === "running");
  if (!running)
    return steps.length ? activities.thinking : activities[activity];
  const label = copy.get(running.label)?.live ?? running.label;
  return running.detail ? `${label}: ${running.detail}` : label;
}

export interface ActivityLine {
  id: string;
  label: string;
  detail?: string;
  status: AssistantToolStep["status"];
  icon: ActivityIcon;
  elapsedMs?: number;
}

/** Collapses consecutive identical steps so five reads become one line. */
export function activityLines(
  steps: readonly AssistantToolStep[],
): ActivityLine[] {
  const groups: { step: AssistantToolStep; count: number; elapsed: number }[] =
    [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (
      last &&
      last.step.label === step.label &&
      last.step.detail === step.detail &&
      last.step.status === step.status
    ) {
      last.count += 1;
      last.elapsed += step.elapsedMs ?? 0;
      continue;
    }
    groups.push({ step, count: 1, elapsed: step.elapsedMs ?? 0 });
  }
  return groups.map(({ step, count, elapsed }) => {
    const text = copy.get(step.label);
    const label = !text
      ? step.label
      : step.status === "running"
        ? text.live
        : count > 1
          ? (text.many?.(count) ?? `${text.done} ${count} times`)
          : text.done;
    return {
      id: step.id,
      label,
      detail: step.detail,
      status: step.status,
      icon: text?.icon ?? "operation",
      elapsedMs: elapsed || undefined,
    };
  });
}
