import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { localDay } from "@/features/sources/lib/import-scope";
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

function toggle(label: string): HTMLElement {
  const found = host.querySelector<HTMLElement>(
    `[role="switch"][aria-label="${label}"]`,
  );
  if (!found) throw new Error(`Missing switch: ${label}`);
  return found;
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(host.querySelectorAll("button")).find(
    (element) => element.textContent === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

async function choose(field: string, option: string): Promise<void> {
  const trigger = host.querySelector<HTMLElement>(`[aria-label="${field}"]`);
  if (!trigger) throw new Error(`Missing select: ${field}`);
  await act(async () => trigger.click());
  const found = await vi.waitFor(() => {
    const match = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
    ).find((element) => element.textContent?.startsWith(option));
    if (!match) throw new Error(`Missing option: ${option}`);
    return match;
  });
  await act(async () => found.click());
}

async function openCombobox(field: string): Promise<void> {
  const input = host.querySelector<HTMLInputElement>(
    `input[aria-label="${field}"]`,
  );
  if (!input) throw new Error(`Missing combobox: ${field}`);
  await act(async () => {
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
  });
}

async function pick(field: string, option: string): Promise<void> {
  await openCombobox(field);
  const found = await vi.waitFor(() => {
    const match = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
    ).find((element) => element.textContent?.startsWith(option));
    if (!match) throw new Error(`Missing option: ${option}`);
    return match;
  });
  await act(async () => found.click());
}

it("starts the first import with only the lists you keep", async () => {
  await renderFor({
    id: "acc-instagram",
    source: "instagram",
    sync: { importPending: true },
  });
  expect(toggle("Saved Posts").getAttribute("aria-checked")).toBe("true");
  await act(async () => toggle("Liked Posts").click());
  await act(async () => button("Start").click());

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
  await act(async () => toggle("Saved Videos").click());
  await act(async () => toggle("Liked Videos").click());
  expect(button("Start").disabled).toBe(true);
});

it("imports chosen Pinterest boards into Folders", async () => {
  await renderFor({
    id: "acc-pinterest",
    source: "pinterest",
    sync: { importPending: true },
  });
  expect(
    host
      .querySelector('input[aria-label="Boards"]')
      ?.getAttribute("placeholder"),
  ).toBe("All Pins");
  expect(toggle("Add to Folders").getAttribute("aria-checked")).toBe("false");

  await pick("Boards", "Design References");
  expect(
    Array.from(
      document.querySelectorAll('[role="option"]'),
      (option) => option.textContent,
    ),
  ).toEqual(["Design References42", "Memes1"]);
  await vi.waitFor(() => {
    expect(toggle("Add to Folders").getAttribute("aria-checked")).toBe("true");
  });
  await act(async () => button("Start").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-pinterest",
    scope: { collections: [{ id: "915", name: "Design References" }] },
  });
});

it("files every board when you turn on Add to Folders without picking any", async () => {
  await renderFor({
    id: "acc-pinterest",
    source: "pinterest",
    sync: { importPending: true },
  });
  await act(async () => toggle("Add to Folders").click());
  await act(async () => button("Start").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-pinterest",
    scope: { addToFolders: true },
  });
});

it("keeps chosen boards out of Folders when you turn it off", async () => {
  await renderFor({
    id: "acc-pinterest",
    source: "pinterest",
    sync: { importScope: { collections: [{ id: "915", name: "Design" }] } },
  });
  await act(async () => toggle("Add to Folders").click());
  await act(async () => button("Save").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-pinterest",
    scope: {
      collections: [{ id: "915", name: "Design" }],
      addToFolders: false,
    },
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
  expect(query).not.toHaveBeenCalledWith(
    "accounts.importOptions",
    expect.anything(),
  );
  await openCombobox("Boards");
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
  expect(toggle("Saved Posts").getAttribute("aria-checked")).toBe("false");
  await act(async () => toggle("Saved Posts").click());
  await act(async () => button("Save").click());

  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-instagram",
    scope: {},
  });
  expect(syncRunNow).not.toHaveBeenCalled();
});

it("starts a TikTok import from Liked Videos alone", async () => {
  await renderFor({
    id: "acc-tiktok",
    source: "tiktok",
    sync: { importPending: true },
  });
  await act(async () => toggle("Favorites").click());
  await act(async () => button("Start").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-tiktok",
    scope: { listKinds: ["liked"] },
  });
});

it("dims collections and Add to Folders while the saved list is off", async () => {
  await renderFor({
    id: "acc-instagram",
    source: "instagram",
    sync: { importPending: true },
  });
  const input = () =>
    host.querySelector<HTMLInputElement>('input[aria-label="Collections"]');
  expect(input()?.disabled).toBe(false);
  await act(async () => toggle("Saved Posts").click());
  expect(input()?.disabled).toBe(true);
  expect(toggle("Add to Folders").getAttribute("aria-disabled")).toBe("true");
  expect(input()?.closest("div[aria-disabled]")).not.toBeNull();
});

it("keeps the date visible but off until you choose Custom Date", async () => {
  await renderFor({
    id: "acc-reddit",
    source: "reddit",
    sync: { importPending: true },
  });
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label^="Date"]');
  expect(trigger?.disabled).toBe(true);
  await choose("Posted Since", "Custom Date");
  expect(trigger?.disabled).toBe(false);
});

it("dims YouTube's Add to Folders until you pick a playlist", async () => {
  await renderFor({
    id: "acc-youtube",
    source: "youtube",
    sync: { importPending: true },
  });
  expect(
    host.querySelector<HTMLButtonElement>(
      'button[aria-label="About Add to Folders"]',
    )?.disabled,
  ).toBe(false);
  expect(toggle("Add to Folders").getAttribute("aria-checked")).toBe("false");
  expect(toggle("Add to Folders").getAttribute("aria-disabled")).toBe("true");
});

it("saves media and date filters with the scope", async () => {
  await renderFor({
    id: "acc-reddit",
    source: "reddit",
    sync: { importPending: true },
  });
  await pick("Kinds of Posts", "Images");
  await pick("Kinds of Posts", "Videos");
  await choose("Posted Since", "Custom Date");
  const trigger = await vi.waitFor(() => {
    const found = host.querySelector<HTMLElement>('[aria-label^="Date"]');
    if (!found) throw new Error("Missing date picker");
    return found;
  });
  await act(async () => trigger.click());
  const now = new Date();
  const first = localDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const day = await vi.waitFor(() => {
    const found = document.querySelector<HTMLButtonElement>(
      `[data-day="${first}"]`,
    );
    if (!found) throw new Error("Missing calendar day");
    return found;
  });
  await act(async () => day.click());
  await act(async () => button("Start").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-reddit",
    scope: { mediaKinds: ["image", "video"], since: first },
  });
});

it("goes back to every kind of post when you remove the last chip", async () => {
  await renderFor({
    id: "acc-reddit",
    source: "reddit",
    sync: { importScope: { mediaKinds: ["video"] } },
  });
  const remove = host.querySelector<HTMLElement>(
    '[aria-label="Remove Videos"]',
  );
  await act(async () => remove?.click());
  await act(async () => button("Save").click());
  expect(query).toHaveBeenCalledWith("accounts.setImportScope", {
    accountId: "acc-reddit",
    scope: {},
  });
});
