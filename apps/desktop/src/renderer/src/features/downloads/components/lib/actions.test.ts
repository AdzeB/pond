import { Dialog } from "@pond/ui";
import { beforeEach, expect, it, vi } from "vitest";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { statusFeed } from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { trashSaves } from "@/features/saves/lib/mutate";
import { notify } from "@/shared/lib/toast";
import { trashDownloadRows } from "./actions";

vi.mock("@/features/saves/lib/mutate", () => ({
  trashSaves: vi.fn(async () => 1),
}));
vi.mock("@/shared/lib/toast", () => ({ notify: vi.fn() }));

const row = {
  saveId: "save-1",
  live: true,
  status: "failed",
} as DownloadRow;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(downloadsSelection, "clear");
  vi.spyOn(statusFeed, "error");
  vi.stubGlobal("window", {
    pond: { undo: vi.fn(async () => ({ ok: true })) },
  });
});

it("moves downloads to Trash immediately and offers Undo", async () => {
  const confirm = vi.spyOn(Dialog, "confirm");

  trashDownloadRows([row]);

  await vi.waitFor(() =>
    expect(downloadsSelection.clear).toHaveBeenCalledOnce(),
  );
  expect(trashSaves).toHaveBeenCalledWith(["save-1"]);
  expect(confirm).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Moved download to Trash",
      action: expect.objectContaining({ label: "Undo" }),
    }),
  );

  const options = vi.mocked(notify).mock.calls[0]?.[0];
  options?.action?.onClick();
  expect(window.pond.undo).toHaveBeenCalledOnce();
});
