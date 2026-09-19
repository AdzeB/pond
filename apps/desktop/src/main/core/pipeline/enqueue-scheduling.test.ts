import { describe, expect, it } from "vitest";
import { createPendingTasks } from "./enqueue-scheduling";
import { isInteractiveTask } from "./priority";

describe("createPendingTasks", () => {
  it("preserves planned operation order and interactive priority", () => {
    const now = new Date(1);
    let nextId = 0;
    const rows = createPendingTasks(
      "save-id",
      "web",
      now,
      "toolbar",
      () => `task-${nextId++}`,
    );

    expect(rows.map((row) => row.op)).toEqual([
      "harvest_metadata",
      "render_text_cover",
      "fetch_blobs",
      "archive_page",
      "finalize",
    ]);
    expect(rows.map((row) => row.id)).toEqual([
      "task-0",
      "task-1",
      "task-2",
      "task-3",
      "task-4",
    ]);
    expect(
      rows.every((row) => isInteractiveTask({ payload: row.payload ?? null })),
    ).toBe(true);
    expect(rows.every((row) => row.nextRunAt === now)).toBe(true);
  });

  it("keeps background tasks unprioritized and local saves taskless", () => {
    const background = createPendingTasks(
      "save-id",
      "twitter",
      new Date(1),
      "sync:twitter",
    );

    expect(background.every((row) => row.payload == null)).toBe(true);
    expect(
      createPendingTasks("local-id", "local", new Date(1), "toolbar"),
    ).toEqual([]);
  });
});
