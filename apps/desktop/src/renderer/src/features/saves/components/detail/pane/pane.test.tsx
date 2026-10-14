import "@/app/effects/save-library-bridge";
import { mediaEmbeddingVersion } from "@shared/embeddings";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { libraryChrome } from "@/features/library";
import { normalise, SavePatchSchema } from "@/features/saves/lib/reconcile";
import { pool } from "@/features/saves/state/pool";
import { setSaveViewerFileIndex } from "@/features/saves/state/save-viewer";
import { SaveInspector } from ".";

let host: HTMLDivElement;
let root: Root;
const requests: Array<{
  name: string;
  input: Record<string, string | string[] | number>;
}> = [];
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  pool.clear();
  setSaveViewerFileIndex(null);
  requests.length = 0;
  vi.stubGlobal("pond", {
    query: async (
      name: string,
      input: Record<string, string | string[] | number>,
    ) => {
      requests.push({ name, input });
      if (name === "folders.list" || name === "folders.memberships") return [];
      if (name === "saves.rawJson")
        return {
          rawJson:
            pool.get(z.object({ id: z.string() }).parse(input).id)?.rawJson ??
            null,
        };
      if (name === "saves.getMany")
        return [
          SavePatchSchema.parse({
            id: "cold",
            notes: "Other",
            source: "local",
            url: "https://other.test",
            tags: ["Shared"],
            fileSize: 2048,
          }),
        ];
      return { changed: 2 };
    },
  });
  const save = normalise(
    SavePatchSchema.parse({
      id: "a",
      title: "Screenshot",
      description: "Captured page description",
      source: "local",
      notes: "First",
      url: "https://example.test",
      tags: ["Shared", "One"],
      rating: 3,
      width: 640,
      height: 480,
      fileSize: 1024,
    }),
  );
  if (!save) throw new Error("Invalid Save fixture");
  pool.upsert(save);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  pool.clear();
  setSaveViewerFileIndex(null);
  vi.unstubAllGlobals();
});

async function selectInspectorTab(label: "Organize" | "Properties") {
  const tab = [
    ...host.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ].find((candidate) => candidate.textContent === label);
  if (!tab) throw new Error(`Missing ${label} tab`);
  await act(async () => tab.click());
  return tab;
}

function setInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("loads the complete selection before displaying mixed notes, tags and total size", async () => {
  await act(async () =>
    root.render(
      <SaveInspector
        saveId="a"
        saveIds={["a", "cold"]}
        folders={[{ id: "folder", name: "Inspiration", count: 1 }]}
      />,
    ),
  );
  expect(requests).toContainEqual({
    name: "saves.getMany",
    input: { ids: ["cold"] },
  });
  expect(host.textContent).toContain("One (1/2)");
  expect(host.textContent).toContain("Inspiration (1/2)");
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Notes"]')
      ?.placeholder,
  ).toBe("Multiple notes");
  const title = host.querySelector<HTMLTextAreaElement>('[aria-label="Title"]');
  const description = host.querySelector<HTMLTextAreaElement>(
    '[aria-label="Description"]',
  );
  expect(title?.disabled).toBe(true);
  expect(title?.placeholder).toBe("Multiple titles");
  expect(description?.disabled).toBe(true);
  expect(description?.placeholder).toBe("Multiple descriptions");

  await selectInspectorTab("Properties");
  expect(host.textContent).toContain("2 items selected");
  expect(host.textContent).toContain("3 KiB");
  expect(host.textContent).not.toContain("Dimensions");
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Source URL"]'),
  ).toBeNull();
});

it("uses available thumbnails for the multi-selection stack before title fallbacks", async () => {
  const missing = normalise(
    SavePatchSchema.parse({
      id: "missing-preview",
      title: "Missing preview",
      source: "local",
      files: [],
    }),
  );
  if (!missing) throw new Error("Invalid missing preview fixture");
  pool.upsert(missing);

  const ids = [missing.id];
  for (let index = 1; index <= 4; index++) {
    const save = normalise(
      SavePatchSchema.parse({
        id: `preview-${index}`,
        title: `Preview ${index}`,
        source: "local",
        files: [
          {
            kind: "original",
            path: `preview-${index}.jpg`,
            sha256: `0123456789abcde${index}`,
            size: 1024,
            mimeType: "image/jpeg",
          },
        ],
      }),
    );
    if (!save) throw new Error(`Invalid preview ${index} fixture`);
    pool.upsert(save);
    ids.push(save.id);
  }

  await act(async () =>
    root.render(<SaveInspector saveId={ids[0] ?? ""} saveIds={ids} />),
  );

  await selectInspectorTab("Properties");
  expect(host.querySelectorAll("figure img")).toHaveLength(4);
  expect(host.textContent).not.toContain("Missing preview");
});

it("shows editable identity fields and places the URL in Source", async () => {
  const current = pool.get("a");
  if (!current) throw new Error("Missing Save fixture");
  pool.upsert({
    ...current,
    source: "twitter",
    author: "Example Author",
    rawJson: {
      extractorId: "test",
      extractedAt: "2026-01-01T00:00:00.000Z",
      capture: {
        id: "a",
        source: "twitter",
        url: "https://example.test",
        media: [],
        metrics: { likes: 42, views: 120 },
      },
    },
  });
  await act(async () => root.render(<SaveInspector saveId="a" />));
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Title"]')?.value,
  ).toBe("Screenshot");
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Title"]')?.readOnly,
  ).toBe(false);
  expect(
    host
      .querySelector<HTMLTextAreaElement>('[aria-label="Title"]')
      ?.closest('[data-slot="root"]'),
  ).toMatchObject({ dataset: { size: "sm", variant: "primary" } });
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Title"]')
      ?.placeholder,
  ).toBe("Add a title");
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Description"]')
      ?.value,
  ).toBe("Captured page description");
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Description"]')
      ?.readOnly,
  ).toBe(false);
  expect(
    host
      .querySelector<HTMLTextAreaElement>('[aria-label="Description"]')
      ?.closest('[data-slot="root"]'),
  ).toMatchObject({ dataset: { size: "sm", variant: "primary" } });
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Source URL"]'),
  ).toBeNull();
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Notes"]')
      ?.placeholder,
  ).toBe("Add notes");
  const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    "Organize",
    "Properties",
  ]);
  expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
    "Organize",
    "Properties",
  ]);
  expect(tabs.every((tab) => tab.querySelector("svg"))).toBe(true);
  expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
  await act(async () =>
    tabs[0]?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    ),
  );
  expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
  await selectInspectorTab("Organize");
  const organizeSectionButtons = [...host.querySelectorAll("button")].filter(
    (button) => button.getAttribute("aria-expanded") !== null,
  );
  expect(organizeSectionButtons.map((button) => button.textContent)).toEqual(
    expect.arrayContaining(["Title", "Tags", "Description", "Notes"]),
  );
  const titleTrigger = organizeSectionButtons.find(
    (button) => button.textContent === "Title",
  );
  expect(titleTrigger?.closest('[data-divider="none"]')).not.toBeNull();
  expect(host.textContent).not.toContain("Rating");
  expect(
    organizeSectionButtons.map((button) => button.textContent),
  ).not.toEqual(expect.arrayContaining(["Properties", "Source", "Activity"]));
  expect(host.textContent).toContain("Folders");
  expect(host.querySelector('[aria-label="Add Tag"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Add Folder"]')).not.toBeNull();

  const tagsTrigger = organizeSectionButtons.find(
    (button) => button.textContent === "Tags",
  );
  if (!tagsTrigger) throw new Error("Missing Tags section trigger");
  await act(async () => tagsTrigger.click());
  expect(tagsTrigger.getAttribute("aria-expanded")).toBe("false");

  await selectInspectorTab("Properties");
  expect(host.querySelector('[aria-label="Title"]')).toBeNull();
  expect(host.textContent).toContain("640 × 480");
  expect(host.textContent).toContain("Likes42");
  expect(host.textContent).toContain("Views120");
  const infoSectionButtons = [...host.querySelectorAll("button")].filter(
    (button) => button.getAttribute("aria-expanded") !== null,
  );
  expect(infoSectionButtons.map((button) => button.textContent)).toEqual(
    expect.arrayContaining(["Properties", "Source", "Activity"]),
  );
  expect(host.textContent).toContain("Rating");
  const sourceTrigger = infoSectionButtons.find(
    (button) => button.textContent === "Source",
  );
  if (!sourceTrigger) throw new Error("Missing Source section trigger");
  expect(sourceTrigger.getAttribute("aria-expanded")).toBe("false");
  await act(async () => sourceTrigger.click());
  expect(sourceTrigger.getAttribute("aria-expanded")).toBe("true");
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Source URL"]')?.readOnly,
  ).toBe(false);
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Source URL"]')?.value,
  ).toBe("https://example.test");
  expect(host.querySelector('[aria-label="Open Source URL"]')).toBeNull();
  expect(host.textContent).toContain("Example Author");
  expect(host.textContent).toContain("Imported");
  expect(host.textContent).toContain("Modified");
  expect(host.textContent).not.toContain("Additional Details");
  expect(host.querySelector("details:not([open])")).toBeNull();
  expect(
    [...host.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Export",
    ),
  ).toBe(false);
});

it("keeps Description visible when it is empty or matches the title", async () => {
  const current = pool.get("a");
  if (!current) throw new Error("Missing Save fixture");
  pool.upsert({ ...current, description: current.title });

  await act(async () => root.render(<SaveInspector saveId="a" />));

  const description = host.querySelector<HTMLTextAreaElement>(
    '[aria-label="Description"]',
  );
  expect(description?.value).toBe("Screenshot");

  await act(async () => {
    pool.upsert({ ...current, description: null });
  });
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Description"]'),
  ).not.toBeNull();
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Description"]')
      ?.value,
  ).toBe("");
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Description"]')
      ?.placeholder,
  ).toBe("Add a description");

  await act(async () => {
    pool.upsert({ ...current, title: null, description: null });
  });
  expect(
    host.querySelector<HTMLTextAreaElement>('[aria-label="Title"]')
      ?.placeholder,
  ).toBe("Add a title");
});

it("hides empty read-only sections and keeps empty addable sections static", async () => {
  const current = pool.get("a");
  if (!current) throw new Error("Missing Save fixture");
  pool.upsert({
    ...current,
    tags: [],
    rawJson: null,
    author: null,
  });

  await act(async () => root.render(<SaveInspector saveId="a" />));

  const sectionButtons = [...host.querySelectorAll("button")].filter(
    (button) => button.getAttribute("aria-expanded") !== null,
  );
  expect(sectionButtons.map((button) => button.textContent)).not.toEqual(
    expect.arrayContaining(["Tags", "Folders", "Activity"]),
  );
  expect(host.textContent).toContain("Tags");
  expect(host.textContent).toContain("Folders");
  expect(host.querySelector('[aria-label="Add Tag"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Add Folder"]')).not.toBeNull();
});

it("removes only the clicked folder immediately for every selected Save", async () => {
  await act(async () =>
    root.render(
      <SaveInspector
        saveId="a"
        saveIds={["a", "cold"]}
        folders={[{ id: "folder", name: "Inspiration", count: 1 }]}
      />,
    ),
  );
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>(
        '[aria-label="Remove folder Inspiration"]',
      )
      ?.click(),
  );
  expect(requests).toContainEqual({
    name: "folders.assign",
    input: { saveIds: ["a", "cold"], addIds: [], removeIds: ["folder"] },
  });
  expect(host.textContent).not.toContain("Apply");
});

it("does not expose a local Save's internal identity as a source link", async () => {
  const current = pool.get("a");
  if (!current) throw new Error("Missing Save fixture");
  pool.upsert({ ...current, url: "pond:local/a" });
  await act(async () => root.render(<SaveInspector saveId="a" />));
  await selectInspectorTab("Properties");
  const sourceTrigger = [...host.querySelectorAll("button")].find(
    (button) =>
      button.getAttribute("aria-expanded") !== null &&
      button.textContent === "Source",
  );
  if (!sourceTrigger) throw new Error("Missing Source section trigger");
  await act(async () => sourceTrigger.click());
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Source URL"]')?.value,
  ).toBe("");
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Source URL"]')
      ?.placeholder,
  ).toBe("No source URL");
});

it("assigns a mixed folder immediately from the inspector menu", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  await act(async () =>
    root.render(
      <SaveInspector
        saveId="a"
        saveIds={["a", "cold"]}
        folders={[{ id: "folder", name: "Inspiration", count: 1 }]}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Add Folder"]',
  );
  if (!trigger) throw new Error("Missing Add Folder");
  await act(async () => trigger.click());
  const checkbox = document.querySelector<HTMLElement>('[role="treeitem"]');
  if (!checkbox) throw new Error("Missing folder checkbox");
  expect(checkbox.dataset.selection).toBe("mixed");
  expect(checkbox.getAttribute("aria-label")).toContain("some selected");
  await act(async () => checkbox.click());
  expect(requests).toContainEqual({
    name: "folders.assign",
    input: { saveIds: ["a", "cold"], addIds: ["folder"], removeIds: [] },
  });
});

it("shows child folders as inset tree rows and keeps search results contextual", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  await act(async () =>
    root.render(
      <SaveInspector
        saveId="a"
        folders={[
          { id: "parent", name: "Reference", count: 0 },
          {
            id: "child",
            name: "A very long collection name that needs truncation",
            parentId: "parent",
            count: 0,
          },
          { id: "standalone", name: "Loose Saves", count: 0 },
        ]}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Add Folder"]',
  );
  if (!trigger) throw new Error("Missing Add Folder");
  await act(async () => trigger.click());

  const expand = document.querySelector<HTMLElement>(
    '[role="treeitem"][aria-label="Reference"]',
  );
  expect(expand?.getAttribute("aria-expanded")).toBe("true");
  expect(document.body.textContent).toContain(
    "A very long collection name that needs truncation",
  );
  expect(document.querySelector('[aria-label="All Folders"]')).toBeNull();
  expect(document.querySelector('[aria-label="Recent Folders"]')).toBeNull();
  expect(document.querySelector('[aria-label="Selected Folders"]')).toBeNull();
  const nested = document.querySelector<HTMLElement>(
    '[role="treeitem"][data-depth="1"]',
  );
  expect(nested?.getAttribute("style")).toContain("--folder-depth: 1");

  const search = document.querySelector<HTMLInputElement>(
    '[aria-label="Search Folders"]',
  );
  if (!search) throw new Error("Missing folder search");
  const initialActive = search.getAttribute("aria-activedescendant");
  await act(async () =>
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    ),
  );
  expect(search.getAttribute("aria-activedescendant")).not.toBe(initialActive);
  expect(document.activeElement).toBe(search);
  await act(async () => setInput(search, "collection"));
  const result = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.includes("collection name"));
  expect(result?.textContent).toContain("Reference");
  expect(result?.querySelector("[title]")?.getAttribute("title")).toBe(
    "Reference / A very long collection name that needs truncation",
  );
});

it("loads Related Saves only when the section opens and opens a selected Save", async () => {
  const current = pool.get("a");
  if (!current) throw new Error("Missing Save fixture");
  pool.upsert({ ...current, clipModel: mediaEmbeddingVersion() });
  const query = vi.fn(
    async (name: string, input: Record<string, string | string[] | number>) => {
      requests.push({ name, input });
      if (name === "saves.related") {
        return {
          items: [
            {
              id: "related",
              score: 0.9,
              reason: "semantically-related",
            },
          ],
        };
      }
      if (name === "saves.getMany") {
        return [
          SavePatchSchema.parse({
            id: "related",
            title: "Related Save",
            source: "local",
            url: "pond:local/related",
            mediaType: "image",
            files: [
              {
                kind: "original",
                path: "related.jpg",
                mimeType: "image/jpeg",
                sha256: "0123456789abcdef",
                size: 1024,
              },
            ],
          }),
        ];
      }
      if (name === "saves.rawJson") return { rawJson: null };
      return [];
    },
  );
  vi.stubGlobal("pond", { query });

  await act(async () => root.render(<SaveInspector saveId="a" tab="info" />));
  expect(query).not.toHaveBeenCalledWith("saves.related", expect.anything());

  const trigger = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) =>
      button.textContent === "Related" &&
      button.getAttribute("aria-expanded") === "false",
  );
  if (!trigger) throw new Error("Missing Related section");
  await act(async () => trigger.click());

  expect(query).toHaveBeenCalledWith("saves.related", { id: "a", limit: 12 });
  expect(
    query.mock.calls.every(([name]) =>
      ["saves.rawJson", "saves.related", "saves.getMany"].includes(name),
    ),
  ).toBe(true);
  const related = host.querySelector<HTMLButtonElement>(
    '[aria-label="Open Related Save"]',
  );
  expect(related).not.toBeNull();
  await act(async () => related?.click());
  expect(libraryChrome.getState().inspectorSaveId).toBe("related");
});
