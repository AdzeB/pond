// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { libraryHeader } from "@/stores/library-header";
import { ViewMenu } from ".";

vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));

describe("view menu", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    libraryHeader.closePopover();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    libraryHeader.closePopover();
    vi.unstubAllGlobals();
  });

  it("keeps layout options and omits sort and notes", async () => {
    await act(async () => root.render(<ViewMenu />));
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="View Options"]')
        ?.click();
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Layout");
    expect(text).toContain("Show Name");
    expect(text).not.toContain("Sort By");
    expect(text).not.toContain("Show Notes");
  });
});
