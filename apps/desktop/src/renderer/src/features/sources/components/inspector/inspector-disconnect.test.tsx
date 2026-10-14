import { Dialog } from "@pond/ui";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SourceInspector } from "@/features/sources/components/inspector";
import { refetchAccounts } from "@/features/sources/hooks/use-accounts";
import { sourceDetail } from "@/features/sources/state/source-detail";

let root: Root;
let host: HTMLDivElement;

const account = {
  id: "acc-tiktok",
  source: "tiktok",
  handle: null,
  label: null,
  addedAt: "2026-01-01T00:00:00.000Z",
  sync: { lastSyncedAt: null, lastError: null, knownCount: 0 },
  connected: true,
  syncing: false,
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return 240;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 280;
    },
  });
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      if (name === "accounts.list") return { accounts: [account] };
      if (name === "accounts.disconnect") return { ok: true };
      if (name === "watches.list") return { watches: [] };
      throw new Error(name);
    },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  sourceDetail.close();
  vi.stubGlobal("pond", {
    query: async () => ({ accounts: [], watches: [] }),
  });
  await refetchAccounts();
  vi.unstubAllGlobals();
});

it("disconnects from a confirm dialog over connection details", async () => {
  const query = vi.fn(async (name: string) => {
    if (name === "accounts.list") return { accounts: [account] };
    if (name === "accounts.disconnect") return { ok: true };
    if (name === "watches.list") return { watches: [] };
    throw new Error(name);
  });
  vi.stubGlobal("pond", { query });
  await act(async () => {
    root.render(
      <>
        <Dialog.Host />
        <Dialog.Root open>
          <Dialog.Portal>
            <Dialog.Popup>
              <SourceInspector kind="account" id={account.id} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </>,
    );
  });
  await vi.waitFor(() => {
    expect(
      document.querySelector('[aria-label="Source Actions"]'),
    ).not.toBeNull();
  });
  const trigger = document.querySelector('[aria-label="Source Actions"]');
  if (!(trigger instanceof HTMLElement))
    throw new Error("Missing Source Actions");
  await act(async () => {
    trigger.click();
  });
  await vi.waitFor(() => {
    expect(
      Array.from(document.querySelectorAll('[role="menuitem"]')).some(
        (item) => item.textContent === "Disconnect TikTok",
      ),
    ).toBe(true);
  });
  const disconnect = Array.from(
    document.querySelectorAll('[role="menuitem"]'),
  ).find((item) => item.textContent === "Disconnect TikTok");
  if (!(disconnect instanceof HTMLElement))
    throw new Error("Missing Disconnect");
  await act(async () => {
    disconnect.click();
  });
  await vi.waitFor(() => {
    expect(
      document.querySelector('[role="alertdialog"]')?.textContent,
    ).toContain("stay in your library");
  });
  const confirm = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
  ).find((button) => button.textContent === "Disconnect");
  if (!confirm) throw new Error("Missing confirm Disconnect");
  await act(async () => {
    confirm.click();
  });
  await vi.waitFor(() => {
    expect(query).toHaveBeenCalledWith("accounts.disconnect", {
      accountId: account.id,
    });
  });
});
