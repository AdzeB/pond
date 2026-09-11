import { OPS, type Op } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import {
  type DownloadRow,
  STAGE_LABELS,
} from "@/features/downloads/lib/status-feed";
import { downloadStatusIcon, downloadStatusLabel } from "./status";

function row(
  status: DownloadRow["status"],
  extras: Partial<DownloadRow> = {},
): DownloadRow {
  return {
    id: status,
    saveId: status,
    name: status,
    url: "https://example.com",
    source: "web",
    status,
    stage: null,
    op: null,
    progress: null,
    attempts: 0,
    error: null,
    ts: 0,
    durationMs: null,
    live: true,
    ...extras,
  };
}

describe("downloadStatusLabel", () => {
  it("names queue and outcome states", () => {
    expect(downloadStatusLabel(row("pending"), false)).toBe("Waiting");
    expect(downloadStatusLabel(row("pending"), true)).toBe("Paused");
    expect(
      downloadStatusLabel(row("pending", { interactive: true }), true),
    ).toBe("Waiting");
    expect(downloadStatusLabel(row("retrying"), false)).toBe("Trying again");
    expect(downloadStatusLabel(row("blocked"), false)).toBe("Waiting to retry");
    expect(downloadStatusLabel(row("failed"), false)).toBe("Couldn't download");
    expect(downloadStatusLabel(row("complete"), false)).toBe(
      "Saved to your library",
    );
    expect(downloadStatusLabel(row("cancelled"), false)).toBe("Cancelled");
  });

  it("uses the stage while a save is running", () => {
    expect(
      downloadStatusLabel(
        row("running", { stage: "Reading page", op: "harvest_metadata" }),
        false,
      ),
    ).toBe("Reading page");
    expect(downloadStatusLabel(row("running"), false)).toBe("Downloading");
  });
});

describe("downloadStatusIcon", () => {
  it("does not reuse the download glyph for waiting or reading a page", () => {
    const waiting = downloadStatusIcon(row("pending"), false);
    const reading = downloadStatusIcon(
      row("running", { stage: "Reading page", op: "harvest_metadata" }),
      false,
    );
    const downloading = downloadStatusIcon(
      row("running", { stage: "Downloading media", op: "fetch_blobs" }),
      false,
    );
    expect(waiting).not.toBe(downloading);
    expect(reading).not.toBe(downloading);
    expect(waiting).not.toBe(reading);
  });

  it("gives every pipeline stage its own icon", () => {
    const icons = new Set(
      OPS.map((op: Op) =>
        downloadStatusIcon(
          row("running", { op, stage: STAGE_LABELS[op] }),
          false,
        ),
      ),
    );
    expect(icons.size).toBe(OPS.length);
  });
});
