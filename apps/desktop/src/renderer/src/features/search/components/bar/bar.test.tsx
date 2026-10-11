import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { PrefsSchema } from "@pond/schema";
import type { LexicalEditor } from "lexical";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetFilters,
  setSearchInput,
  useFilterQuery,
  useSearchInput,
} from "@/features/library";
import type { SearchComposerProps } from "./";
import { SearchComposer } from "./";
import { $writeSearchString } from "./lib/editor-state";

interface SearchHarness {
  compile: ReturnType<
    typeof vi.fn<NonNullable<SearchComposerProps["compile"]>>
  >;
  editor: LexicalEditor | null;
}
const harness: SearchHarness = { compile: vi.fn(), editor: null };
function CaptureEditor() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    harness.editor = editor;
    return () => {
      harness.editor = null;
    };
  }, [editor]);
  return null;
}

function SearchState() {
  return (
    <>
      <output>{useSearchInput()}</output>
      <output data-filter-state>{JSON.stringify(useFilterQuery())}</output>
    </>
  );
}

describe("search editor synchronization", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("pond", {
      query: async (name: string) =>
        name === "settings.getPrefs" ? PrefsSchema.parse({}) : [],
      onSyncAction: () => () => {},
      onSyncStatus: () => () => {},
      onSaveUpdated: () => () => {},
    });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(),
    });
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [],
    });
    resetFilters();
    harness.compile.mockReset();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("updates a mounted editor from menu selections without stealing focus", async () => {
    await act(async () => {
      root.render(
        <>
          <SearchComposer compile={harness.compile}>
            <CaptureEditor />
          </SearchComposer>
          <button type="button">Filter</button>
          <SearchState />
        </>,
      );
    });
    const trigger = host.querySelector<HTMLButtonElement>(
      "button:last-of-type",
    );
    trigger?.focus();
    await act(async () => {
      setSearchInput(
        [{ field: "type", operator: "in", value: ["image", "video"] }],
        "design",
        "type:image,video design",
      );
    });
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe("type:image,video design");
    expect(host.querySelector("output")?.textContent).toBe(
      "type:image,video design",
    );
    expect(document.activeElement).toBe(trigger);

    await act(async () => setSearchInput([], "design", "design"));
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe("design");
    expect(host.querySelector("output")?.textContent).toBe("design");
  });

  it("clears the existing editor when filters are reset outside search", async () => {
    setSearchInput(
      [{ field: "tags", operator: "some", value: ["design"] }],
      "",
      "tag:design",
    );
    await act(async () =>
      root.render(
        <SearchComposer compile={harness.compile}>
          <CaptureEditor />
        </SearchComposer>,
      ),
    );
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe("tag:design");
    await act(async () => resetFilters());
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe("");
  });

  it("keeps a newer typed query when an earlier search finishes", async () => {
    const pending = Promise.withResolvers<{
      plan: { filter: { combinator: "and"; rules: [] } };
      residual: string;
    }>();
    harness.compile.mockReturnValue(pending.promise);
    setSearchInput([], "old query", "old query");
    await act(async () =>
      root.render(
        <SearchComposer compile={harness.compile}>
          <CaptureEditor />
        </SearchComposer>,
      ),
    );
    const input = host.querySelector<HTMLElement>("[data-library-search]");
    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(harness.compile).toHaveBeenCalledWith("old query");
    expect(input?.getAttribute("aria-busy")).toBe("true");
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "Finding filters",
    );
    await act(async () =>
      harness.editor?.update(() => $writeSearchString("new query")),
    );
    await act(async () =>
      pending.resolve({
        plan: { filter: { combinator: "and", rules: [] } },
        residual: "old query",
      }),
    );
    expect(input?.textContent?.trim()).toBe("new query");
    expect(input?.getAttribute("aria-busy")).toBe("false");
  });

  it("does not restore a query cleared while a search is pending", async () => {
    const pending = Promise.withResolvers<{
      plan: { filter: { combinator: "and"; rules: [] } };
      residual: string;
    }>();
    harness.compile.mockReturnValue(pending.promise);
    setSearchInput([], "cats", "cats");
    await act(async () =>
      root.render(
        <SearchComposer compile={harness.compile}>
          <CaptureEditor />
        </SearchComposer>,
      ),
    );
    const input = host.querySelector<HTMLElement>("[data-library-search]");
    await act(async () =>
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="Clear Search"]')
        ?.click(),
    );
    await act(async () =>
      pending.resolve({
        plan: { filter: { combinator: "and", rules: [] } },
        residual: "cats",
      }),
    );
    expect(input?.textContent?.trim()).toBe("");
    expect(input?.getAttribute("aria-busy")).toBe("false");
  });

  it("preserves explicit filters when interpreting the remaining words", async () => {
    harness.compile.mockResolvedValue({
      plan: { filter: { combinator: "and", rules: [] } },
      residual: "cats",
    });
    setSearchInput(
      [{ field: "source", operator: "eq", value: "youtube.com" }],
      "cats",
      "source:youtube.com cats",
    );
    await act(async () =>
      root.render(
        <SearchComposer compile={harness.compile}>
          <CaptureEditor />
        </SearchComposer>,
      ),
    );
    const input = host.querySelector<HTMLElement>("[data-library-search]");
    await act(async () =>
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(harness.compile).toHaveBeenCalledWith("cats");
    expect(input?.textContent?.trim()).toBe("cats");
  });

  it("does not reinterpret a query that contains only explicit filters", async () => {
    setSearchInput(
      [{ field: "source", operator: "eq", value: "youtube.com" }],
      "",
      "source:youtube.com",
    );
    await act(async () =>
      root.render(
        <SearchComposer compile={harness.compile}>
          <CaptureEditor />
        </SearchComposer>,
      ),
    );
    const input = host.querySelector<HTMLElement>("[data-library-search]");
    await act(async () =>
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(harness.compile).not.toHaveBeenCalled();
    expect(input?.textContent?.trim()).toBe("");
  });

  it("keeps toolbar filters while typing and clearing keyword search", async () => {
    const rule = {
      field: "source" as const,
      operator: "eq" as const,
      value: "youtube.com",
    };
    setSearchInput([rule], "", "");
    await act(async () =>
      root.render(
        <>
          <SearchComposer compile={harness.compile}>
            <CaptureEditor />
          </SearchComposer>
          <SearchState />
        </>,
      ),
    );
    const input = host.querySelector<HTMLElement>("[data-library-search]");
    expect(input?.textContent?.trim()).toBe("");
    await act(async () =>
      harness.editor?.update(() => $writeSearchString("cats")),
    );
    expect(input?.textContent?.trim()).toBe("cats");
    expect(
      JSON.parse(host.querySelector("[data-filter-state]")?.textContent ?? "{}")
        .rules,
    ).toEqual([rule]);
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="Clear Search"]')
        ?.click(),
    );
    expect(input?.textContent?.trim()).toBe("");
    expect(
      JSON.parse(host.querySelector("[data-filter-state]")?.textContent ?? "{}")
        .rules,
    ).toEqual([rule]);
  });

  it("moves completed filter syntax into the toolbar without dropping other filters", async () => {
    const rule = {
      field: "source" as const,
      operator: "eq" as const,
      value: "youtube.com",
    };
    setSearchInput([rule], "", "");
    await act(async () =>
      root.render(
        <>
          <SearchComposer compile={harness.compile}>
            <CaptureEditor />
          </SearchComposer>
          <SearchState />
        </>,
      ),
    );
    await act(async () =>
      harness.editor?.update(() => $writeSearchString("type:video")),
    );
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe("");
    expect(
      JSON.parse(host.querySelector("[data-filter-state]")?.textContent ?? "{}")
        .rules,
    ).toEqual([rule, { field: "type", operator: "eq", value: "video" }]);
    await act(async () =>
      harness.editor?.update(() => $writeSearchString("cats")),
    );
    expect(
      JSON.parse(host.querySelector("[data-filter-state]")?.textContent ?? "{}")
        .rules,
    ).toHaveLength(2);
  });

  it("waits for a quoted filter value to finish before moving it into the toolbar", async () => {
    await act(async () =>
      root.render(
        <>
          <SearchComposer compile={harness.compile}>
            <CaptureEditor />
          </SearchComposer>
          <SearchState />
        </>,
      ),
    );
    await act(async () =>
      harness.editor?.update(() => $writeSearchString('creator:"Jane ')),
    );
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe('creator:"Jane');
    await act(async () =>
      harness.editor?.update(() => $writeSearchString('creator:"Jane Doe"')),
    );
    expect(
      host.querySelector("[data-library-search]")?.textContent?.trim(),
    ).toBe("");
    expect(
      JSON.parse(host.querySelector("[data-filter-state]")?.textContent ?? "{}")
        .rules,
    ).toEqual([{ field: "creator", operator: "eq", value: "jane doe" }]);
  });
});
