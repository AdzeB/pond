import { expect, it } from "vitest";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { buildDownloadMenuItems } from "./context-menu";

function row(status: DownloadRow["status"]): DownloadRow {
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
    error: null,
    ts: 1,
    durationMs: null,
    live: true,
  };
}

function actions(status: DownloadRow["status"]) {
  return buildDownloadMenuItems([row(status)]).flatMap((item) =>
    "label" in item ? [item] : [],
  );
}

it("keeps download actions in the row context menu", () => {
  const failed = actions("failed");
  expect(failed.map((item) => item.label)).toEqual([
    "Retry Download",
    "Cancel Download",
    "Skip Download",
    "Move to Trash",
    "Clear Selection",
  ]);
  expect(
    failed.map((item) =>
      "disabled" in item ? (item.disabled ?? false) : false,
    ),
  ).toEqual([false, true, false, false, false]);

  const running = actions("running");
  expect(
    running.map((item) =>
      "disabled" in item ? (item.disabled ?? false) : false,
    ),
  ).toEqual([true, false, false, false, false]);
});
