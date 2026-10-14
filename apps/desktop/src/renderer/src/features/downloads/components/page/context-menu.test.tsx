import { expect, it } from "vitest";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { buildDownloadMenuItems } from "./context-menu";

function row(
  status: DownloadRow["status"],
  error: string | null = null,
): DownloadRow {
  return {
    id: status,
    saveId: status,
    name: status,
    url: `https://example.com/${status}`,
    source: "web",
    status,
    stage: null,
    op: null,
    progress: null,
    attempts: 0,
    error,
    ts: 1,
    durationMs: null,
    live: true,
  };
}

function visible(rows: DownloadRow[]) {
  return buildDownloadMenuItems(rows).flatMap((item) =>
    "label" in item && !item.hidden ? [item] : [],
  );
}

function disabled(items: ReturnType<typeof visible>) {
  return items.map((item) =>
    "disabled" in item ? (item.disabled ?? false) : false,
  );
}

it("keeps download actions in the row context menu", () => {
  const failed = visible([row("failed", "Network error")]);
  expect(failed.map((item) => item.label)).toEqual([
    "Retry Download",
    "Cancel Download",
    "Skip Download",
    "Copy Link",
    "Copy Error",
    "Move to Trash",
    "Clear Selection",
  ]);
  expect(disabled(failed)).toEqual([
    false,
    true,
    false,
    false,
    false,
    false,
    false,
  ]);

  const running = visible([row("running")]);
  expect(running.map((item) => item.label)).toEqual([
    "Retry Download",
    "Cancel Download",
    "Skip Download",
    "Copy Link",
    "Move to Trash",
    "Clear Selection",
  ]);
  expect(disabled(running)).toEqual([true, false, false, false, false, false]);
});

it("offers Open Save only for a finished download", () => {
  expect(visible([row("complete")])[0]?.label).toBe("Open Save");
  expect(
    visible([row("complete"), row("failed")]).map((item) => item.label),
  ).not.toContain("Open Save");
});
