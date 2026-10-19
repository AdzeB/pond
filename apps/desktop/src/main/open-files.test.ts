import { describe, expect, it, vi } from "vitest";
import { flushOpenFiles, queueOpenFile } from "./open-files";

function fakeWindow(loading: boolean) {
  const webContents = {
    isLoading: () => loading,
    send: vi.fn(),
    once: vi.fn((_event: string, listener: () => void) => listener()),
  };
  const win = { isDestroyed: () => false, webContents };
  return { win, webContents };
}

describe("flushOpenFiles", () => {
  it("sends every queued file as one batch and skips Libraries", async () => {
    const { win, webContents } = fakeWindow(false);
    const openLibraryWindow = vi.fn(async () => {});
    queueOpenFile("/tmp/a.png");
    queueOpenFile("/tmp/Archive.pond");
    queueOpenFile("/tmp/b.pdf");
    await flushOpenFiles({ openLibraryWindow, getMainWindow: () => win });
    expect(openLibraryWindow).toHaveBeenCalledOnce();
    expect(webContents.send).toHaveBeenCalledExactlyOnceWith(
      "pond:open-files",
      ["/tmp/a.png", "/tmp/b.pdf"],
    );

    await flushOpenFiles({ openLibraryWindow, getMainWindow: () => win });
    expect(openLibraryWindow).toHaveBeenCalledOnce();
  });

  it("waits for a loading window before sending", async () => {
    const { win, webContents } = fakeWindow(true);
    queueOpenFile("/tmp/a.png");
    await flushOpenFiles({
      openLibraryWindow: async () => {},
      getMainWindow: () => win,
    });
    expect(webContents.once).toHaveBeenCalledWith(
      "did-finish-load",
      expect.any(Function),
    );
    expect(webContents.send).toHaveBeenCalledOnce();
  });

  it("does not open a window when only a Library was dropped", async () => {
    const openLibraryWindow = vi.fn(async () => {});
    queueOpenFile("/tmp/Archive.pond");
    await flushOpenFiles({ openLibraryWindow, getMainWindow: () => null });
    expect(openLibraryWindow).not.toHaveBeenCalled();
  });
});
