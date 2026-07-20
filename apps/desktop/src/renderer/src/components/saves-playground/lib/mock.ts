import { useEffect, useRef, useState } from "react";

/** Stand-in for the ingest pipeline so the prototypes animate without saving anything real. */

export type MockStatus = "saving" | "saved" | "failed";

export type Scenario = "mixed" | "failures" | "heavy" | "clear";

export type StepState = "done" | "active" | "pending" | "failed";

export interface MockStep {
  label: string;
  state: StepState;
}

export interface MockSave {
  id: string;
  title: string;
  url: string;
  source: string;
  kind: string;
  size: number | null;
  hue: number;
  status: MockStatus;
  progress: number;
  stage: string | null;
  error: string | null;
  completedAt: number | null;
}

interface PipelineStep {
  label: string;
  until: number;
}

export const PIPELINE: readonly PipelineStep[] = [
  { label: "Reading page", until: 0.18 },
  { label: "Downloading media", until: 0.55 },
  { label: "Archiving site", until: 0.92 },
  { label: "Finalizing", until: 1 },
];

const FIRST_STAGE = "Reading page";
const LAST_STAGE = "Finalizing";

export function stageFor(progress: number): string {
  for (const step of PIPELINE) {
    if (progress < step.until) return step.label;
  }
  return LAST_STAGE;
}

export function stepsFor(save: MockSave): MockStep[] {
  let prevUntil = 0;
  return PIPELINE.map((step) => {
    const from = prevUntil;
    prevUntil = step.until;
    let state: StepState;
    if (save.status === "saved" || save.progress >= step.until) state = "done";
    else if (save.progress >= from)
      state = save.status === "failed" ? "failed" : "active";
    else state = "pending";
    return { label: step.label, state };
  });
}

interface Seed {
  title: string;
  url: string;
  source: string;
  kind: string;
  hue: number;
  size: number;
}

const POUR_OVER: Seed = {
  title: "The perfect pour-over, explained",
  url: "https://www.youtube.com/watch?v=x9b2m",
  source: "YouTube",
  kind: "Video",
  hue: 4,
  size: 84_300_000,
};
const BARBICAN: Seed = {
  title: "brutalist concrete stairwell, Barbican",
  url: "https://www.pinterest.com/pin/88231",
  source: "Pinterest",
  kind: "Image",
  hue: 210,
  size: 2_400_000,
};
const TYPE_THREAD: Seed = {
  title: "sasha on type revivals",
  url: "https://x.com/sasha/status/17781",
  source: "Twitter",
  kind: "Tweet",
  hue: 152,
  size: 640_000,
};
const AMIE: Seed = {
  title: "Amie - AI Note Taker",
  url: "https://amie.so/",
  source: "Web",
  kind: "Page",
  hue: 46,
  size: 4_900_000,
};
const CERAMICS: Seed = {
  title: "studio ceramics moodboard",
  url: "https://www.are.na/block/29441",
  source: "Are.na",
  kind: "Image",
  hue: 24,
  size: 1_100_000,
};
const KITCHEN: Seed = {
  title: "kitchen render, warm oak + steel",
  url: "https://www.instagram.com/p/DK4x2",
  source: "Instagram",
  kind: "Image",
  hue: 280,
  size: 3_800_000,
};
const QOVES: Seed = {
  title: "QOVES - Facial Aesthetics Report",
  url: "https://www.qoves.com/",
  source: "Web",
  kind: "Page",
  hue: 190,
  size: 24_000_000,
};
const RAIN: Seed = {
  title: "field recording: rain on canvas tent",
  url: "https://www.youtube.com/watch?v=r41nn",
  source: "YouTube",
  kind: "Video",
  hue: 230,
  size: 51_000_000,
};
const LINEN: Seed = {
  title: "linen studies, overexposed",
  url: "https://www.cosmos.so/e/linen-studies",
  source: "Cosmos",
  kind: "Image",
  hue: 68,
  size: 900_000,
};
const ARCHIVE_THREAD: Seed = {
  title: "mira's thread on archive formats",
  url: "https://x.com/mira/status/99412",
  source: "Twitter",
  kind: "Tweet",
  hue: 330,
  size: 410_000,
};
const SHIORI: Seed = {
  title: "Shiori - bookmark everything",
  url: "https://www.shiori.sh/",
  source: "Web",
  kind: "Page",
  hue: 132,
  size: 1_400_000,
};
const RING: Seed = {
  title: "silver ring, cast from a walnut",
  url: "https://www.pinterest.com/pin/74110",
  source: "Pinterest",
  kind: "Image",
  hue: 12,
  size: 1_900_000,
};

const SEEDS: readonly Seed[] = [
  POUR_OVER,
  BARBICAN,
  TYPE_THREAD,
  AMIE,
  CERAMICS,
  KITCHEN,
  QOVES,
  RAIN,
  LINEN,
  ARCHIVE_THREAD,
  SHIORI,
  RING,
];

const ERR_BLOCKED = "No pages captured. The site may be blocking robots.";
const ERR_PRIVATE = "Video is private or removed.";
const ERR_RATE = "Rate limited by Pinterest. Retrying works after a pause.";
const ERR_SESSION = "Session expired. Reconnect Twitter to keep capturing.";

let counter = 0;

function makeSave(seed: Seed, overrides: Partial<MockSave> = {}): MockSave {
  counter += 1;
  return {
    id: `mock-${counter}`,
    title: seed.title,
    url: seed.url,
    source: seed.source,
    kind: seed.kind,
    size: null,
    hue: seed.hue,
    status: "saving",
    progress: 0,
    stage: FIRST_STAGE,
    error: null,
    completedAt: null,
    ...overrides,
  };
}

function saved(seed: Seed, minutesAgo: number): MockSave {
  return makeSave(seed, {
    status: "saved",
    progress: 1,
    stage: null,
    size: seed.size,
    completedAt: Date.now() - minutesAgo * 60_000,
  });
}

function failed(seed: Seed, progress: number, error: string): MockSave {
  return makeSave(seed, { status: "failed", progress, stage: null, error });
}

function saving(seed: Seed, progress: number): MockSave {
  return makeSave(seed, { progress, stage: stageFor(progress) });
}

function seedScenario(scenario: Scenario): MockSave[] {
  switch (scenario) {
    case "clear":
      return [
        saved(AMIE, 2),
        saved(BARBICAN, 9),
        saved(TYPE_THREAD, 14),
        saved(RAIN, 41),
      ];
    case "failures":
      return [
        failed(QOVES, 0.34, ERR_BLOCKED),
        failed(POUR_OVER, 0.61, ERR_PRIVATE),
        failed(RING, 0.22, ERR_RATE),
        failed(ARCHIVE_THREAD, 0.08, ERR_SESSION),
        saved(AMIE, 6),
        saved(CERAMICS, 18),
      ];
    case "heavy":
      return [
        ...SEEDS.map((seed, i) => saving(seed, (i * 0.083) % 0.9)),
        ...SEEDS.slice(0, 8).map((seed, i) =>
          saving(seed, (i * 0.11 + 0.05) % 0.85),
        ),
        saved(TYPE_THREAD, 1),
        saved(KITCHEN, 3),
      ];
    default:
      return [
        saving(POUR_OVER, 0.72),
        saving(QOVES, 0.38),
        saving(KITCHEN, 0.12),
        failed(SHIORI, 0.31, ERR_BLOCKED),
        saved(BARBICAN, 1),
        saved(TYPE_THREAD, 4),
        saved(AMIE, 11),
        saved(CERAMICS, 26),
        saved(LINEN, 52),
      ];
  }
}

const TICK_MS = 600;

export interface MockSaves {
  rows: MockSave[];
  retry: (id: string) => void;
  retryAll: () => void;
  stopAll: () => void;
  clearFinished: () => void;
}

export function useMockSaves(scenario: Scenario): MockSaves {
  const [rows, setRows] = useState<MockSave[]>(() => seedScenario(scenario));
  const spawnPool = useRef(0);

  useEffect(() => {
    setRows(seedScenario(scenario));
    spawnPool.current =
      scenario === "heavy" ? 10 : scenario === "mixed" ? 4 : 0;
  }, [scenario]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRows((prev) => {
        const next = prev.map((row) => {
          if (row.status !== "saving") return row;
          const progress = Math.min(
            1,
            row.progress + 0.01 + Math.random() * 0.045,
          );
          if (progress >= 1) {
            const seed = SEEDS.find((x) => x.title === row.title);
            return {
              ...row,
              status: "saved" as const,
              progress: 1,
              stage: null,
              size: seed?.size ?? 2_000_000,
              completedAt: Date.now(),
            };
          }
          return { ...row, progress, stage: stageFor(progress) };
        });
        /** Keep the scene alive while comparing layouts: replace finished items until the pool drains. */
        const savingCount = next.filter((r) => r.status === "saving").length;
        const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)];
        if (savingCount < 2 && spawnPool.current > 0 && seed) {
          spawnPool.current -= 1;
          next.unshift(makeSave(seed));
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return {
    rows,
    retry: (id) =>
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "saving",
                error: null,
                stage: stageFor(r.progress),
              }
            : r,
        ),
      ),
    retryAll: () =>
      setRows((prev) =>
        prev.map((r) =>
          r.status === "failed"
            ? {
                ...r,
                status: "saving",
                error: null,
                stage: stageFor(r.progress),
              }
            : r,
        ),
      ),
    stopAll: () =>
      setRows((prev) =>
        prev.map((r) =>
          r.status === "saving"
            ? { ...r, status: "failed", stage: null, error: "Stopped." }
            : r,
        ),
      ),
    clearFinished: () =>
      setRows((prev) => prev.filter((r) => r.status !== "saved")),
  };
}
