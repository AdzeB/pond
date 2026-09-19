import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { refetchAccounts } from "@/features/sources/hooks/use-accounts";
import { connectFlow } from "@/features/sources/state/connect-flow";
import { ConnectWaitSection } from "./";

let root: Root;
let host: HTMLDivElement;

const twitterAccount = {
  id: "acc-twitter",
  source: "twitter",
  handle: "raph",
  label: null,
  addedAt: "2026-01-01T00:00:00.000Z",
  sync: { lastSyncedAt: null, lastError: null, knownCount: 0 },
  connected: true,
  syncing: false,
};

function stubPond(
  onImported?: (
    cb: (payload: { source: string; accountId: string }) => void,
  ) => void,
) {
  vi.stubGlobal("pond", {
    query: async () => ({ accounts: [twitterAccount] }),
    connectSource: async () => ({ ok: true, mode: "external" }),
    syncRunNow: async () => ({ ok: true }),
    clearPendingSession: async () => ({ ok: true }),
    onSessionImported: (
      cb: (payload: { source: string; accountId: string }) => void,
    ) => {
      onImported?.(cb);
      return () => {};
    },
  });
}

beforeEach(() => {
  stubPond();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  connectFlow.clear();
  vi.stubGlobal("pond", {
    query: async () => ({ accounts: [] }),
    connectSource: async () => ({ ok: true, mode: "external" }),
    syncRunNow: async () => ({ ok: true }),
    clearPendingSession: async () => ({ ok: true }),
    onSessionImported: () => () => {},
  });
  await refetchAccounts();
  vi.unstubAllGlobals();
});

it("marks the wait screen connected when a new account arrives", async () => {
  connectFlow.start("twitter", []);
  await act(async () => {
    root.render(<ConnectWaitSection />);
  });
  await vi.waitFor(() => {
    expect(host.textContent).toContain("Connected");
  });
});

it("marks the wait screen connected when an existing account is reimported", async () => {
  let imported:
    | ((payload: { source: string; accountId: string }) => void)
    | undefined;
  stubPond((cb) => {
    imported = cb;
  });
  connectFlow.start("twitter", ["acc-twitter"]);
  await act(async () => {
    root.render(<ConnectWaitSection />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(host.textContent).toContain("Requesting Connection");
  const sessionImported = imported;
  if (!sessionImported)
    throw new Error("session import listener was not attached");
  await act(async () => {
    sessionImported({ source: "twitter", accountId: "acc-twitter" });
  });
  await vi.waitFor(() => {
    expect(host.textContent).toContain("Connected");
  });
});
