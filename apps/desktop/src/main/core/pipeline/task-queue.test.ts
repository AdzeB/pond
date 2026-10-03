import { describe, expect, it } from "vitest";
import type { DueTask } from "./reconciler-config";
import { isDueTaskRunnable, scheduleDueTasks } from "./task-queue";

function task(saveId: string, extras: Partial<DueTask> = {}): DueTask {
  const now = new Date(0);
  return {
    id: extras.id ?? saveId,
    saveId,
    op: "harvest_metadata",
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    generationId: null,
    cancellationFence: 0,
    deferredReason: null,
    leaseOwner: null,
    leaseToken: null,
    leaseExpiresAt: null,
    heartbeatAt: null,
    startedAt: null,
    failedAt: null,
    completedAt: null,
    nextRunAt: now,
    lastError: null,
    payload: null,
    createdAt: now,
    updatedAt: now,
    source: "web",
    ...extras,
  };
}

describe("scheduleDueTasks", () => {
  it("starts a pasted link before newer background ingest", () => {
    const background = task("sync-later", {
      id: "bg",
      source: "twitter",
      createdAt: new Date(2),
    });
    const pasted = task("pasted-link", {
      id: "user",
      payload: { priority: "interactive" },
      createdAt: new Date(1),
    });
    expect(scheduleDueTasks([background, pasted]).map((row) => row.id)).toEqual(
      ["user", "bg"],
    );
  });
});

describe("isDueTaskRunnable", () => {
  it("starts a pasted harvest while the source is cooling down", () => {
    const pasted = task("pasted-link", {
      source: "twitter",
      payload: { priority: "interactive" },
    });
    const background = task("sync-later", { source: "twitter" });
    expect(isDueTaskRunnable(pasted, Date.now() + 60_000)).toBe(true);
    expect(isDueTaskRunnable(background, Date.now() + 60_000)).toBe(false);
    expect(isDueTaskRunnable(background, 0)).toBe(true);
  });
});
