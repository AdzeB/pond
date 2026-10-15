import { beforeEach, describe, expect, it, vi } from "vitest";
import { notify } from "@/shared/lib/toast";
import { presentUpdateNotice } from "./update-notice";

vi.mock("@/shared/lib/toast", () => ({
  notify: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(notify).mockClear();
  vi.stubGlobal("pond", {
    query: vi.fn(async () => ({ ok: true })),
  });
});

describe("presentUpdateNotice", () => {
  it("downloads from the available toast", () => {
    presentUpdateNotice({
      phase: "available",
      version: "1.0.2",
      downloading: false,
    });
    const toast = vi.mocked(notify).mock.calls[0]?.[0];
    toast?.action?.onClick();
    expect(window.pond.query).toHaveBeenCalledWith("updates.download", {});
  });

  it("restarts from the ready toast", () => {
    presentUpdateNotice({ phase: "downloaded", version: "1.0.2" });
    const toast = vi.mocked(notify).mock.calls[0]?.[0];
    toast?.action?.onClick();
    expect(window.pond.query).toHaveBeenCalledWith("updates.install", {});
  });
});
