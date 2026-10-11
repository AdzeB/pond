import { afterEach, expect, it, vi } from "vitest";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import type { NotifyOptions } from "@/shared/lib/toast";
import { trashDownloadRows } from "./actions";

const row: DownloadRow = {
  id: "save-1",
  saveId: "save-1",
  name: "Download",
  url: "https://example.com",
  source: "web",
  status: "failed",
  stage: null,
  op: null,
  progress: null,
  attempts: 1,
  error: null,
  ts: 0,
  durationMs: null,
  live: true,
};

function createTrashFake(outcome: "trashed" | "rejected") {
  const trashed: (readonly string[])[] = [];
  const notices: NotifyOptions[] = [];
  let undone = 0;
  return {
    trashed,
    notices,
    undone: () => undone,
    dependencies: {
      trash: async (ids: readonly string[]) => {
        trashed.push(ids);
        if (outcome === "rejected") throw new Error("Disk unavailable");
        return ids.length;
      },
      notify: (options: NotifyOptions) => {
        notices.push(options);
        return options.id;
      },
      undo: async () => {
        undone += 1;
        return { ok: true };
      },
    },
  };
}

afterEach(() => downloadsSelection.clear());

it("moves downloads to Trash immediately and offers Undo", async () => {
  const fake = createTrashFake("trashed");
  downloadsSelection.set([row]);

  trashDownloadRows([row], fake.dependencies);

  expect(fake.trashed).toEqual([["save-1"]]);
  await vi.waitFor(() => expect(downloadsSelection.size()).toBe(0));
  expect(fake.notices).toEqual([
    expect.objectContaining({
      title: "Moved download to Trash",
      action: expect.objectContaining({ label: "Undo" }),
    }),
  ]);

  fake.notices[0]?.action?.onClick();
  expect(fake.undone()).toBe(1);
});

it("keeps the selection and skips the Undo notice when Trash fails", async () => {
  const fake = createTrashFake("rejected");
  downloadsSelection.set([row]);

  trashDownloadRows([row], fake.dependencies);

  expect(fake.trashed).toEqual([["save-1"]]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(downloadsSelection.size()).toBe(1);
  expect(fake.notices).toEqual([]);
});
