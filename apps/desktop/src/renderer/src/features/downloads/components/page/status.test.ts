import { describe, expect, it } from "vitest";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { downloadStatusLabel } from "./status";

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
  it("uses short table labels", () => {
    expect(downloadStatusLabel(row("pending"), false)).toBe("In Progress");
    expect(downloadStatusLabel(row("pending"), true)).toBe("Paused");
    expect(
      downloadStatusLabel(row("pending", { interactive: true }), true),
    ).toBe("In Progress");
    expect(downloadStatusLabel(row("running"), false)).toBe("In Progress");
    expect(
      downloadStatusLabel(
        row("running", { stage: "Reading page", op: "harvest_metadata" }),
        false,
      ),
    ).toBe("In Progress");
    expect(downloadStatusLabel(row("retrying"), false)).toBe("In Progress");
    expect(downloadStatusLabel(row("blocked"), false)).toBe("Failed");
    expect(downloadStatusLabel(row("failed"), false)).toBe("Failed");
    expect(downloadStatusLabel(row("complete"), false)).toBe("Completed");
    expect(downloadStatusLabel(row("cancelled"), false)).toBe("Cancelled");
    expect(downloadStatusLabel(row("skipped"), false)).toBe("Skipped");
  });
});
