import { describe, expect, it } from "vitest";
import { createEnqueueBundle } from "./enqueue-persistence";

describe("createEnqueueBundle", () => {
  it("binds Save, tasks, and sync action to one identity", () => {
    const now = new Date(1);
    const bundle = createEnqueueBundle(
      {
        url: "https://example.com/article",
        source: "web",
        sourceId: "https://example.com/article",
        listKinds: ["saved"],
      },
      { accountId: "account-id", trigger: "user:quickAdd" },
      now,
      "user:quickAdd",
    );

    expect(bundle.save).toMatchObject({
      id: bundle.action.modelId,
      source: "web",
      sourceId: "https://example.com/article",
      accountId: "account-id",
      status: "ingesting",
      ingestStartedAt: now,
      listKinds: ["saved"],
    });
    expect(bundle.tasks.every((task) => task.saveId === bundle.save.id)).toBe(
      true,
    );
    expect(bundle.action).toMatchObject({
      modelName: "save",
      action: "I",
      actor: "user",
      actorReason: "user:quickAdd",
      data: bundle.save,
    });
  });
});
