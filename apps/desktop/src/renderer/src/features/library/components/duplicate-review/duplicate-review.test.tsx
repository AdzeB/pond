import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { normalise } from "@/features/saves/lib/reconcile";
import { pool } from "@/features/saves/state/pool";
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
    comments: [],
  };
}

it("lets the user change the keeper, exclude a candidate, and review excluded matches after merging", async () => {
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
  for (const id of ["match-a", "match-b", "match-c"]) {
    const save = normalise(row(id));
    if (save) pool.upsert(save);
  }
  const query = vi.fn(async (name: string, input: { ids?: string[] }) => {
    if (name === "saves.findDuplicates")
      return {
        groups: [{ kind: "exact", ids: ["match-a", "match-b", "match-c"] }],
        total: 3,
        visualIndexed: 0,
      };
    if (name === "saves.getMany") return (input.ids ?? []).map(row);
    if (name === "settings.getPrefs") return PrefsSchema.parse({});
    return { ok: true, trashed: 1 };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DuplicateReview saveId="match-a" />));
    const radios = [
      ...document.querySelectorAll<HTMLInputElement>("input[type=radio]"),
    ];
    expect(radios).toHaveLength(3);
    await act(async () => radios[1]?.click());
    const checks = [
      ...document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
    ];
    await act(async () => checks[2]?.click());
    const merge = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Merge Selected",
    );
    await act(async () => merge?.click());
    expect(query).toHaveBeenCalledWith("saves.mergeDuplicates", {
      keepId: "match-b",
      ids: ["match-a", "match-b"],
    });
    expect(document.body.textContent).toContain("match-c");
    expect(document.body.textContent).toContain("match-b");
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
