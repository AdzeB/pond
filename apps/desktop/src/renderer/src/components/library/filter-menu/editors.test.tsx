// @vitest-environment jsdom
import type { Predicate } from "@pond/schema/filters/types";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FilterCategory } from "./category";
import { choiceOptions, presetOptions } from "./options";

vi.mock("./use-choice-counts", () => ({
  useChoiceCounts: () => ({
    counts: new Map([
      ["design", 2],
      ["motion", 1],
    ]),
    empty: 1,
    partial: false,
  }),
}));
vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));

describe("filter editors", () => {
  let root: Root;
  let host: HTMLDivElement;
  let rows: Predicate[];
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    rows = [];
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });
  async function render(field: Predicate["field"], initial: Predicate[] = []) {
    function Harness() {
      const [value, setValue] = useState(initial);
      rows = value;
      return (
        <FilterCategory
          field={field}
          options={
            field === "tags"
              ? choiceOptions(field, [
                  { label: "Design", value: "design" },
                  { label: "Motion", value: "motion" },
                ])
              : presetOptions(field)
          }
          rows={value}
          onChange={setValue}
        />
      );
    }
    await act(async () => root.render(<Harness />));
    await act(async () =>
      host.querySelector<HTMLButtonElement>("button")?.click(),
    );
  }
  function element(role: string, text: string): HTMLElement {
    const elements = [
      ...document.querySelectorAll<HTMLElement>(`[role="${role}"]`),
    ];
    const match = elements.find(
      (node) =>
        node.getAttribute("aria-label") === text || node.textContent === text,
    );
    if (!match) throw new Error(`Missing ${role}: ${text}`);
    return match;
  }
  async function click(role: string, text: string) {
    await act(async () => element(role, text).click());
  }
  async function fill(label: string, value: string) {
    const labels = [...document.querySelectorAll<HTMLLabelElement>("label")];
    const input =
      document.querySelector<HTMLInputElement>(
        `input[aria-label="${label}"]`,
      ) ??
      document.getElementById(
        labels.find((node) => node.textContent === label)?.htmlFor ?? "",
      );
    if (!(input instanceof HTMLInputElement))
      throw new Error(`Missing input ${label}`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function apply() {
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.click(),
    );
  }

  it("chooses All before selecting values and changes a selection into an exclusion", async () => {
    await render("tags");
    await click("combobox", "Match Selected Values");
    await click("option", "All Selected");
    await click("menuitemcheckbox", "Design2");
    await click("menuitemcheckbox", "Motion1");
    expect(rows).toEqual([
      { field: "tags", operator: "every", value: ["design", "motion"] },
    ]);
    await click("combobox", "Selection Action");
    await click("option", "Exclude");
    await click("menuitemcheckbox", "Motion1");
    expect(rows).toEqual([
      { field: "tags", operator: "every", value: ["design"] },
      { field: "tags", operator: "none", value: ["motion"] },
    ]);
    expect(
      element("menuitemcheckbox", "MotionExcluded1").getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("keeps minutes and the entered bounds after applying a duration range", async () => {
    await render("duration");
    await click("combobox", "Duration Unit");
    await click("option", "Minutes");
    await fill("Minimum", "1");
    await fill("Maximum", "3");
    await apply();
    expect(rows).toEqual([
      { field: "duration", operator: "between", value: [60, 180] },
    ]);
    expect(element("combobox", "Duration Unit").textContent).toBe("Minutes");
    expect(
      [
        ...document.querySelectorAll<HTMLInputElement>('input[type="number"]'),
      ].map((input) => input.value),
    ).toEqual(["1", "3"]);
  });

  it("finds untagged saves through search and lets the exclusion action omit them", async () => {
    await render("tags");
    await fill("Filter Tags", "untagged");
    await click("combobox", "Selection Action");
    await click("option", "Exclude");
    await click("menuitemcheckbox", "Untagged1");
    expect(rows).toEqual([
      { field: "tags", operator: "empty", value: true, negate: true },
    ]);
  });

  it("opens custom dates without applying an empty range, and restores the applied dates", async () => {
    await render("savedAt");
    await click("menuitemcheckbox", "Custom Range");
    expect(rows).toEqual([]);
    await fill("From", "2026-08-01");
    await fill("To", "2026-08-31");
    await apply();
    expect(rows[0]?.operator).toBe("between");
    expect(
      [
        ...document.querySelectorAll<HTMLInputElement>('input[type="date"]'),
      ].map((input) => input.value),
    ).toEqual(["2026-08-01", "2026-08-31"]);
  });

  it("replaces missing-content filtering with phrase matching, and clears the text when selecting presence", async () => {
    await render("note", [{ field: "note", operator: "exists", value: false }]);
    await fill("Search Note", "Design details");
    await apply();
    expect(rows).toEqual([
      { field: "note", operator: "contains", value: "Design details" },
    ]);
    await click("menuitemcheckbox", "With Note");
    expect(rows).toEqual([{ field: "note", operator: "exists", value: true }]);
    expect(
      document.querySelector<HTMLInputElement>(
        'input[aria-label="Search Note"]',
      )?.value,
    ).toBe("");
  });
});
