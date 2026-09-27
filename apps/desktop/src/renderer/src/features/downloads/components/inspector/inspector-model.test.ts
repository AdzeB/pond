import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { downloadInspectorDetails } from "./inspector-model";

function save(partial: Partial<Save>): Save {
  return {
    id: "save-1",
    source: "youtube",
    sourceId: "save-1",
    url: "https://example.com/video",
    title: "Failed download",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: null,
    files: [],
    tags: [],
    savedAt: 1,
    createdAt: 1,
    deletedAt: null,
    status: "failed",
    ingestStartedAt: 1,
    tasks: [
      {
        op: "fetch_video_ytdlp",
        status: "dead",
        attempts: 1,
        maxAttempts: 5,
        lastError: "Network unavailable",
        nextRunAt: 0,
        updatedAt: 1,
      },
    ],
    ...partial,
  };
}

describe("downloadInspectorDetails", () => {
  it("builds task activity and attempt details when measurements are missing", () => {
    const details = downloadInspectorDetails(save({}), 1_000);
    expect(details.tasks).toEqual([
      {
        id: "fetch_video_ytdlp-0",
        label: "Downloading video",
        status: "dead",
        statusLabel: "Stopped",
        error: "Network unavailable",
        current: false,
      },
    ]);
    expect(details.properties).toEqual(
      expect.arrayContaining([{ label: "Attempts", value: "1 of 5" }]),
    );
  });
});
