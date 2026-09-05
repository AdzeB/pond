export type DownloadState =
  | "downloading"
  | "processing"
  | "waiting"
  | "failed"
  | "complete";
export type Scenario =
  | "mixed"
  | "processing"
  | "attention"
  | "complete"
  | "empty";
export type Source = "youtube" | "arena" | "cosmos" | "pinterest" | "instagram";

export type SampleSave = {
  id: number;
  title: string;
  source: Source;
  kind: string;
  state: DownloadState;
  received: number;
  total: number;
  batch?: "videos" | "references";
  error?: string;
  held?: boolean;
};

export const sourceNames = {
  youtube: "YouTube",
  arena: "Are.na",
  cosmos: "Cosmos",
  pinterest: "Pinterest",
  instagram: "Instagram",
} satisfies Record<Source, string>;

export const sources = ["youtube", "arena", "cosmos", "pinterest", "instagram"] satisfies Source[];

export const variants = [
  {
    key: "A",
    name: "List",
    description: "Every save, at a glance",
    detail:
      "A compact list organized by what is happening. Status and recovery stay beside each save.",
  },
  {
    key: "B",
    name: "Sources",
    description: "One source at a time",
    detail:
      "A source navigator keeps larger imports manageable. Select a source to inspect its downloads.",
  },
  {
    key: "C",
    name: "Focus",
    description: "Progress first, problems nearby",
    detail:
      "A larger view of the current download, with waiting saves below and recovery in a separate column.",
  },
  {
    key: "D",
    name: "Transfers",
    description: "A quieter view of everything in flight",
    detail:
      "Compact transfers, expandable imports, and status beside each title. Completed saves have their own history.",
  },
  {
    key: "E",
    name: "Quiet",
    description: "Less chrome. A little more character.",
    detail:
      "A flat, compact queue with soft activity backgrounds and a tiny control strip. Inspired by Leech and Pulli.",
  },
] as const;

export type Variant = (typeof variants)[number]["key"];

const seed: SampleSave[] = [
  {
    id: 4,
    batch: "videos",
    title: "A closer look at the new MacBook",
    source: "youtube",
    kind: "Video",
    state: "downloading",
    received: 84,
    total: 128,
  },
  {
    id: 12,
    batch: "references",
    title: "Studies in Japanese flower arrangement",
    source: "arena",
    kind: "Image",
    state: "downloading",
    received: 2,
    total: 8,
  },
  {
    id: 13,
    batch: "videos",
    title: "A morning on the water",
    source: "youtube",
    kind: "Video",
    state: "waiting",
    received: 0,
    total: 96,
  },
  {
    id: 24,
    batch: "references",
    title: "Natural Selection: an archive of objects",
    source: "arena",
    kind: "Page",
    state: "waiting",
    received: 0,
    total: 4,
  },
  {
    id: 5,
    title: "A cabin by the lake",
    source: "cosmos",
    kind: "Image",
    state: "waiting",
    received: 0,
    total: 6,
  },
  {
    id: 22,
    batch: "videos",
    title: "Looking through the viewfinder",
    source: "youtube",
    kind: "Video",
    state: "failed",
    received: 0,
    total: 112,
    error: "Couldn't download this video. Try again.",
  },
  {
    id: 18,
    batch: "references",
    title: "Code Out, On Test",
    source: "arena",
    kind: "Page",
    state: "failed",
    received: 0,
    total: 3,
    error: "The page didn't respond. Try again.",
  },
  {
    id: 1,
    title: "A study in oxblood",
    source: "pinterest",
    kind: "Image",
    state: "complete",
    received: 3,
    total: 3,
  },
  {
    id: 3,
    title: "Still life, through a compact camera",
    source: "instagram",
    kind: "Image",
    state: "complete",
    received: 5,
    total: 5,
  },
  {
    id: 6,
    batch: "references",
    title: "Runway references",
    source: "arena",
    kind: "Image",
    state: "complete",
    received: 4,
    total: 4,
  },
];

export function makeSaves(scenario: Scenario): SampleSave[] {
  if (scenario === "empty") return [];
  return seed.map((save) => {
    if (scenario === "processing" && save.state === "downloading")
      return { ...save, state: "processing", received: save.total };
    if (scenario === "complete")
      return { ...save, state: "complete", received: save.total };
    if (scenario === "attention" && save.state !== "complete")
      return {
        ...save,
        state: "failed",
        error:
          save.kind === "Video"
            ? "Couldn't download this video. Try again."
            : "The source didn't respond. Try again.",
      };
    return { ...save };
  });
}

export function isActive(save: SampleSave) {
  return (
    save.state === "downloading" ||
    save.state === "processing" ||
    save.state === "waiting"
  );
}

export function statusText(save: SampleSave, paused: boolean): string {
  if (save.state === "failed")
    return save.error ?? "Couldn't download this save. Try again.";
  if (save.state === "complete") return "Saved to your library";
  if (paused || save.held) return "Paused";
  if (save.state === "processing") return "Processing for your library";
  if (save.state === "waiting") return "Waiting to download";
  return save.kind === "Page"
    ? "Saving page"
    : `Downloading ${save.kind.toLowerCase()}`;
}
