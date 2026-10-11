import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { normalise } from "@/features/saves";
import { pool } from "@/features/saves/pool";
import { DuplicateReview } from "./";

function row(id: string) {
  return {
    id,
    source: "web" as const,
    sourceId: id,
    url: `https://fixture.test/${id}`,
    title: id,
    files: [],
    tags: [],
  };
}

function setup(groups: { kind: string; ids: string[] }[]) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(700);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(1200);
  for (const id of groups.flatMap((group) => group.ids)) {
    const save = normalise(row(id));
    if (save) pool.upsert(save);
  }
  const query = vi.fn(async (name: string, input: { ids?: string[] }) => {
    if (name === "saves.findDuplicates")
      return { groups, total: 6, visualIndexed: 0 };
    if (name === "saves.getMany") return (input.ids ?? []).map(row);
    if (name === "settings.getPrefs") return PrefsSchema.parse({});
    return { ok: true, trashed: 1 };
  });
  vi.stubGlobal("pond", { query });
  return query;
}

function byLabel(label: string) {
  const match = document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!match) throw new Error(`Missing ${label}`);
  return match;
}

function mergeButton() {
  return [...document.querySelectorAll("button")].find((button) =>
    button.textContent?.startsWith("Merge"),
  );
}

it("marks one keeper and merges the rest of the group into it", async () => {
  const query = setup([
    { kind: "exact", ids: ["match-a", "match-b", "match-c"] },
  ]);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DuplicateReview saveId="match-a" />));
    expect(byLabel("Keep match-a").getAttribute("aria-pressed")).toBe("true");
    await act(async () => byLabel("Keep match-b").click());
    expect(
      [...document.querySelectorAll("[aria-pressed=true]")].map((tile) =>
        tile.getAttribute("aria-label"),
      ),
    ).toEqual(["Keep match-b"]);
    expect(document.querySelectorAll("section [role=checkbox]")).toHaveLength(
      1,
    );
    await act(async () => mergeButton()?.click());
    expect(query).toHaveBeenCalledWith("saves.mergeDuplicates", {
      keepId: "match-b",
      ids: ["match-a", "match-b", "match-c"],
    });
    expect(document.body.textContent).toContain("No duplicates found");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

it("merges every checked group in one pass", async () => {
  const query = setup([
    { kind: "exact", ids: ["one-a", "one-b"] },
    { kind: "exact", ids: ["two-a", "two-b"] },
    { kind: "exact", ids: ["three-a", "three-b"] },
  ]);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DuplicateReview saveId={null} />));
    const groups = document.querySelectorAll<HTMLElement>(
      "section header [role=checkbox]",
    );
    expect(groups).toHaveLength(3);
    await act(async () => groups[1]?.click());
    await act(async () => mergeButton()?.click());
    const merges = query.mock.calls.filter(
      ([name]) => name === "saves.mergeDuplicates",
    );
    expect(merges.map(([, input]) => input)).toEqual([
      { keepId: "one-a", ids: ["one-a", "one-b"] },
      { keepId: "three-a", ids: ["three-a", "three-b"] },
    ]);
    expect(document.body.textContent).toContain("two-b");
    expect(document.body.textContent).not.toContain("three-b");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

it("lists every kind together and hides near matches an exact group covers", async () => {
  setup([
    { kind: "semantic-near", ids: ["mix-a", "mix-c"] },
    { kind: "visual-near", ids: ["mix-a", "mix-b"] },
    { kind: "exact", ids: ["mix-a", "mix-b"] },
    { kind: "visual-near", ids: ["mix-c", "mix-d"] },
  ]);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DuplicateReview saveId={null} />));
    const headers = [...document.querySelectorAll("section header")].map(
      (header) => header.textContent,
    );
    expect(headers).toEqual([
      "2 matching saves",
      "2 similar saves",
      "2 related saves",
    ]);
    expect(mergeButton()?.textContent).toBe("Merge (2)");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

it("limits groups to the requested ids", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(700);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(420);
  for (const id of ["keep-a", "keep-b", "skip-a", "skip-b"]) {
    const save = normalise(row(id));
    if (save) pool.upsert(save);
  }
  vi.stubGlobal("pond", {
    query: vi.fn(async (name: string, input: { ids?: string[] }) => {
      if (name === "saves.findDuplicates")
        return {
          groups: [
            { kind: "exact", ids: ["keep-a", "keep-b"] },
            { kind: "exact", ids: ["skip-a", "skip-b"] },
          ],
          total: 4,
          visualIndexed: 0,
        };
      if (name === "saves.getMany") return (input.ids ?? []).map(row);
      if (name === "settings.getPrefs") return PrefsSchema.parse({});
      return { ok: true };
    }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(<DuplicateReview saveId={null} ids={["keep-a", "keep-b"]} />),
    );
    expect(document.body.textContent).toContain("keep-a");
    expect(document.body.textContent).not.toContain("skip-a");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

it("separates related content from mergeable duplicate evidence", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(700);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(420);
  for (const id of ["related-a", "related-b"]) {
    const save = normalise(row(id));
    if (save) pool.upsert(save);
  }
  vi.stubGlobal("pond", {
    query: vi.fn(async (name: string, input: { ids?: string[] }) => {
      if (name === "saves.findDuplicates")
        return {
          groups: [
            {
              kind: "semantic-near",
              ids: ["related-a", "related-b"],
              evidence: { model: "current-model", distance: 0.03 },
            },
          ],
          total: 2,
          visualIndexed: 0,
          visualDistance: 6,
        };
      if (name === "saves.getMany") return (input.ids ?? []).map(row);
      if (name === "settings.getPrefs") return PrefsSchema.parse({});
      return { ok: true };
    }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DuplicateReview saveId="related-a" />));
    expect(document.body.textContent).toContain("2 related saves");
    expect(document.querySelectorAll("[aria-pressed]")).toHaveLength(0);
    expect(document.querySelectorAll("[role=checkbox]")).toHaveLength(0);
    expect(mergeButton()).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});
