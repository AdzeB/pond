import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import {
  defaultDownloadFilters,
  historyToDownloadRow,
  matchesDownloadFilters,
  mergeDownloadRows,
  projectLiveDownloads,
  type StatusFilter,
} from "./downloads";

function save(partial: Partial<Save> & Pick<Save, "id" | "status">): Save {
  return {
    source: "twitter",
    sourceId: partial.id,
    url: `https://x.com/i/web/status/${partial.id}`,
    title: partial.title ?? null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: null,
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
    tasks: [],
    ...partial,
  };
}

describe("projectLiveDownloads", () => {
  it("projects ingesting as pending, running, or blocked", () => {
    const rows = projectLiveDownloads([
      save({
        id: "run",
        status: "ingesting",
        title: "Running",
        tasks: [
          {
            op: "harvest_metadata",
            status: "done",
            attempts: 1,
            maxAttempts: 5,
            lastError: null,
            nextRunAt: 0,
            updatedAt: 0,
          },
          {
            op: "fetch_video_ytdlp",
            status: "running",
            attempts: 1,
            maxAttempts: 5,
            lastError: null,
            nextRunAt: 0,
            updatedAt: 0,
          },
        ],
      }),
      save({
        id: "block",
        status: "ingesting",
        title: "Blocked",
        tasks: [
          {
            op: "fetch_blobs",
            status: "blocked",
            attempts: 2,
            maxAttempts: 5,
            lastError: "blocked by rate limit",
            nextRunAt: 0,
            updatedAt: 0,
          },
        ],
      }),
      save({ id: "wait", status: "ingesting", title: "Waiting" }),
      save({ id: "fail", status: "failed", title: "Failed" }),
      save({ id: "done", status: "complete", title: "Done" }),
    ]);
    expect(rows.map((r) => [r.saveId, r.status])).toEqual([
      ["run", "running"],
      ["block", "blocked"],
      ["wait", "pending"],
      ["fail", "failed"],
    ]);
    expect(rows.find((r) => r.saveId === "run")?.stage).toBe(
      "Downloading video",
    );
    expect(rows.find((r) => r.saveId === "run")?.progress).toBe(0.5);
  });

  it("puts work in flight above the queue no matter how old it is", () => {
    const rows = projectLiveDownloads([
      save({ id: "fresh", status: "ingesting", savedAt: 5_000 }),
      save({
        id: "old-runner",
        status: "ingesting",
        savedAt: 1_000,
        tasks: [
          {
            op: "fetch_blobs",
            status: "running",
            attempts: 1,
            maxAttempts: 5,
            lastError: null,
            nextRunAt: 0,
            updatedAt: 0,
          },
        ],
      }),
    ]);
    expect(rows.map((r) => r.saveId)).toEqual(["old-runner", "fresh"]);
  });

  it("skips deleted saves", () => {
    const rows = projectLiveDownloads([
      save({ id: "gone", status: "failed", deletedAt: 1 }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe("matchesDownloadFilters", () => {
  const rows = projectLiveDownloads([
    save({ id: "a", status: "failed", title: "Clip" }),
  ]);
  const row = rows[0];
  if (!row) throw new Error("expected a row");

  it("defaults to in progress and failed", () => {
    expect(matchesDownloadFilters(row, defaultDownloadFilters())).toBe(true);
  });

  it("hides failed when that status is off", () => {
    const filters = {
      ...defaultDownloadFilters(),
      statuses: new Set<StatusFilter>(["in-progress"]),
    };
    expect(matchesDownloadFilters(row, filters)).toBe(false);
  });

  it("matches search against the title", () => {
    const filters = defaultDownloadFilters();
    filters.q = "clip";
    expect(matchesDownloadFilters(row, filters)).toBe(true);
    filters.q = "missing";
    expect(matchesDownloadFilters(row, filters)).toBe(false);
  });
});

describe("mergeDownloadRows", () => {
  it("drops history rows that are still live", () => {
    const live = projectLiveDownloads([
      save({ id: "a", status: "failed", title: "Live" }),
    ]);
    const history = [
      historyToDownloadRow({
        id: 1,
        saveId: "a",
        title: "Old",
        url: "https://x.com/i/web/status/a",
        source: "twitter",
        outcome: "complete",
        durationMs: 1000,
        attempts: 1,
        failedOp: null,
        error: null,
        ts: 1,
      }),
      historyToDownloadRow({
        id: 2,
        saveId: "b",
        title: "Saved",
        url: "https://x.com/i/web/status/b",
        source: "twitter",
        outcome: "complete",
        durationMs: 800,
        attempts: 1,
        failedOp: null,
        error: null,
        ts: 2,
      }),
    ];
    expect(mergeDownloadRows(live, history).map((r) => r.saveId)).toEqual([
      "a",
      "b",
    ]);
  });
});
