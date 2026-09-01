import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantChange } from "../../../shared/assistant";
import { reviewChanges } from "./review";

const mock = vi.hoisted(() => ({
  changes: [] as AssistantChange[],
  title: "Original",
  tags: ["design"],
  folderIds: ["folder"],
  write: vi.fn(),
  saveFolders: vi.fn(),
  fail: false,
}));
vi.mock("../../db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => ({
            role: "assistant",
            metadata: { changes: mock.changes },
            id: "save",
            title: mock.title,
            tags: mock.tags,
          }),
        }),
      }),
    }),
    update: () => ({
      set: ({ metadata }: { metadata: { changes: AssistantChange[] } }) => ({
        where: async () => {
          mock.changes = structuredClone(metadata.changes);
        },
      }),
    }),
  }),
}));
vi.mock("../executor", () => ({ executeTransaction: mock.write }));
vi.mock("../folders", () => ({
  folderIdsForSave: async () => mock.folderIds,
  listFolders: async () => [{ id: "folder" }],
  setSaveFolders: mock.saveFolders,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.title = "Original";
  mock.fail = false;
  mock.changes = [
    {
      id: "change",
      saveId: "save",
      title: "Original",
      reason: "Clearer title",
      field: "title",
      before: "Original",
      after: "Proposed",
      status: "pending",
    },
  ];
  mock.write.mockImplementation(async ({ patch }) => {
    if (mock.fail) throw new Error("Disk unavailable");
    if (patch.title !== undefined) mock.title = patch.title;
  });
});
const input = {
  messageId: "message",
  changeIds: ["change"],
  action: "apply" as const,
};

describe("reviewed library edits", () => {
  it("applies only stored selected proposals and ignores replayed Apply", async () => {
    await reviewChanges({ ...input, changeIds: ["invented"] });
    expect(mock.write).not.toHaveBeenCalled();
    await reviewChanges(input);
    expect(mock.title).toBe("Proposed");
    await reviewChanges(input);
    expect(mock.write).toHaveBeenCalledTimes(1);
  });
  it("keeps newer edits when a proposal is stale", async () => {
    mock.title = "User edited";
    const result = await reviewChanges(input);
    expect(result.changes[0]?.error).toMatch(/newer edit was kept/);
    expect(mock.write).not.toHaveBeenCalled();
  });
  it("supports Undo but refuses to overwrite later edits", async () => {
    await reviewChanges(input);
    mock.title = "Later edit";
    await reviewChanges({ ...input, action: "undo" });
    expect(mock.title).toBe("Later edit");
    expect(mock.changes[0]?.status).toBe("applied");
    mock.title = "Proposed";
    await reviewChanges({ ...input, action: "undo" });
    expect(mock.title).toBe("Original");
    expect(mock.changes[0]?.status).toBe("undone");
  });
  it("retains failures for retry and dismisses without writing", async () => {
    mock.fail = true;
    await reviewChanges(input);
    expect(mock.changes[0]).toMatchObject({
      status: "pending",
      error: "Disk unavailable",
    });
    mock.fail = false;
    await reviewChanges(input);
    expect(mock.changes[0]).toMatchObject({ status: "applied" });
    expect(mock.changes[0]?.error).toBeUndefined();
  });
  it("dismisses pending changes without touching the library", async () => {
    await reviewChanges({ ...input, action: "dismiss" });
    expect(mock.write).not.toHaveBeenCalled();
    expect(mock.changes[0]?.status).toBe("dismissed");
    await reviewChanges(input);
    expect(mock.write).not.toHaveBeenCalled();
  });
});
