// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SourceFlowHost } from "@/features/sources/components/flow/flow";
import { refetchAccounts } from "@/features/sources/hooks/use-accounts";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";

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
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
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
    connectSource: async () => ({ ok: true, mode: "external" }),
    clearPendingSession: async () => ({ ok: true }),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  sourceFlow.close();
  vi.stubGlobal("pond", {
    query: async () => ({ accounts: [], watches: [] }),
  });
  await refetchAccounts();
  vi.unstubAllGlobals();
});

it("disconnects inside the source dialog instead of opening a second overlay", async () => {
  const query = vi.fn(async (name: string) => {
    if (name === "accounts.list") return { accounts: [account] };
    if (name === "accounts.disconnect") return { ok: true };
    if (name === "watches.list") return { watches: [] };
    throw new Error(name);
  });
  vi.stubGlobal("pond", {
    query,
    connectSource: async () => ({ ok: true, mode: "external" }),
    clearPendingSession: async () => ({ ok: true }),
  });
  sourceDetail.openAccount(account.id);
  await act(async () => {
    sourceFlow.open("account-detail");
    sourceFlow.push("account-options");
  });
  await act(async () => {
    root.render(<SourceFlowHost />);
  });
  const dialog = () => document.querySelector('[role="dialog"]');
  await vi.waitFor(() => {
    expect(dialog()?.textContent).toContain("stay in your library");
  });
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  const disconnect = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Disconnect",
  );
  if (!disconnect) throw new Error("Missing Disconnect");
  await act(async () => {
    disconnect.click();
  });
  await vi.waitFor(() => {
    expect(query).toHaveBeenCalledWith("accounts.disconnect", {
      accountId: account.id,
    });
  });
  await vi.waitFor(() => {
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });
});
