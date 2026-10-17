import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  type ImportScopeAccount,
  importScopeFlow,
} from "@/features/sources/state/import-scope-flow";
import { ImportScopeChoices, ImportScopeConfirm } from ".";

let root: Root;
let host: HTMLDivElement;
let query: ReturnType<typeof vi.fn>;
let syncRunNow: ReturnType<typeof vi.fn>;

const BOARDS = [
  { id: "915", name: "Design References", itemCount: 42 },
  { id: "88", name: "Memes", itemCount: 1 },
];

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  query = vi.fn(async (name: string) => {
    if (name === "accounts.importOptions") {
      return { ok: true, collections: BOARDS };
    }
    if (name === "accounts.list") return { accounts: [] };
    return { ok: true };
  });
  syncRunNow = vi.fn(async () => ({ ok: true }));
  vi.stubGlobal("pond", { query, syncRunNow });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  importScopeFlow.clear();
  vi.unstubAllGlobals();
});

async function renderFor(account: ImportScopeAccount): Promise<void> {
  importScopeFlow.open(account);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ImportScopeChoices />
        <ImportScopeConfirm />
      </QueryClientProvider>,
    );
  });
}

function checkbox(label: string): HTMLElement {
  const element = Array.from(host.querySelectorAll("label")).find(
    (candidate) => candidate.textContent === label,
  );
  const target =
    element?.parentElement?.querySelector<HTMLElement>('[role="checkbox"]');
  if (!target) throw new Error(`Missing checkbox: ${label}`);
  return target;
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(host.querySelectorAll("button")).find(
    (element) => element.textContent === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

it("starts the first import with only the lists you keep", async () => {
  await renderFor({
    id: "acc-instagram",
    source: "instagram",
    sync: { importPending: true },
  });
  expect(checkbox("Saved Posts").getAttribute("aria-checked")).toBe("true");
  await act(async () => checkbox("Liked Posts").click());
  await act(async () => button("Start Import").click());

  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-instagram",
    scope: { listKinds: ["saved"] },
  });
  expect(syncRunNow).toHaveBeenCalledWith("acc-instagram");
});

it("won't start an import that would bring in nothing", async () => {
  await renderFor({
    id: "acc-youtube",
    source: "youtube",
    sync: { importPending: true },
  });
  await act(async () => checkbox("Watch Later").click());
  await act(async () => checkbox("Liked Videos").click());
  expect(button("Start Import").disabled).toBe(true);
});

it("imports chosen Pinterest boards", async () => {
  await renderFor({
    id: "acc-pinterest",
    source: "pinterest",
    sync: { importPending: true },
  });
  await act(async () => button("Specific Boards").click());
  await vi.waitFor(() => {
    expect(host.textContent).toContain("Design References");
  });
  expect(host.textContent).toContain("42 pins");
  expect(host.textContent).toContain("1 pin");
  expect(button("Start Import").disabled).toBe(true);

  await act(async () => checkbox("Design References").click());
  await act(async () => button("Start Import").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-pinterest",
    scope: { collections: [{ id: "915", name: "Design References" }] },
  });
});

it("explains a board list Pond couldn't load", async () => {
  query.mockImplementation(async (name: string) =>
    name === "accounts.importOptions"
      ? {
          ok: false,
          error:
            "Pinterest signed you out. Reconnect the Account to load your boards.",
        }
      : { ok: true },
  );
  await renderFor({
    id: "acc-pinterest",
    source: "pinterest",
    sync: { importScope: { collections: [{ id: "915", name: "Design" }] } },
  });
  await vi.waitFor(() => {
    expect(host.textContent).toContain("Pinterest signed you out.");
  });
  expect(button("Try Again")).toBeTruthy();
});

it("saves a change for an active Account without starting a sync", async () => {
  await renderFor({
    id: "acc-instagram",
    source: "instagram",
    sync: { importScope: { listKinds: ["liked"] } },
  });
  expect(checkbox("Saved Posts").getAttribute("aria-checked")).toBe("false");
  await act(async () => checkbox("Saved Posts").click());
  await act(async () => button("Save").click());

  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-instagram",
    scope: {},
  });
  expect(syncRunNow).not.toHaveBeenCalled();
});

it("says when a Source can only import everything", async () => {
  await renderFor({
    id: "acc-tiktok",
    source: "tiktok",
    sync: { importPending: true },
  });
  expect(host.textContent).toContain(
    "Pond imports everything you've saved on TikTok.",
  );
  await act(async () => button("Start Import").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-tiktok",
    scope: {},
  });
});
