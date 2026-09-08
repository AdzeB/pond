// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { refetchAccounts, useAccounts } from "./use-accounts";

let root: Root;
let host: HTMLDivElement;
let payload: { accounts: unknown[] };

function View() {
  const { accounts } = useAccounts();
  return <output>{accounts.map((account) => account.id).join(",")}</output>;
}

function Reload() {
  const { refetch } = useAccounts();
  return (
    <button type="button" onClick={() => void refetch()}>
      Reload
    </button>
  );
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  payload = { accounts: [] };
  vi.stubGlobal("pond", {
    query: async () => payload,
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  payload = { accounts: [] };
  await refetchAccounts();
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("updates every subscriber when one refetch finds a new account", async () => {
  await act(async () => {
    root.render(
      <>
        <View />
        <Reload />
      </>,
    );
  });
  await vi.waitFor(() => {
    expect(host.querySelector("output")?.textContent).toBe("");
  });
  payload = {
    accounts: [
      {
        id: "acc-twitter",
        source: "twitter",
        handle: "raph",
        label: null,
        addedAt: "2026-01-01T00:00:00.000Z",
        sync: { lastSyncedAt: null, lastError: null, knownCount: 0 },
        connected: true,
        syncing: false,
      },
    ],
  };
  await act(async () => {
    host.querySelector("button")?.click();
  });
  await vi.waitFor(() => {
    expect(host.querySelector("output")?.textContent).toBe("acc-twitter");
  });
});
