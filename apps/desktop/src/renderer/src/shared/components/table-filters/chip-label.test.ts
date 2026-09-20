import { describe, expect, it } from "vitest";
import {
  filterChipLabel,
  filterChipSummary,
  uniqueFilterOptions,
} from "./chip-label";

describe("filterChipLabel", () => {
  it("keeps the category name when nothing is selected", () => {
    expect(filterChipLabel("Status", [])).toBe("Status");
  });

  it("names one or two selected values", () => {
    expect(filterChipLabel("Status", ["Failed"])).toBe("Status: Failed");
    expect(filterChipLabel("Status", ["Failed", "Completed"])).toBe(
      "Status: Failed, Completed",
    );
  });

  it("counts three or more selected values", () => {
    expect(filterChipLabel("Source", ["YouTube", "Instagram", "X"])).toBe(
      "Source: 3",
    );
  });
});

describe("filterChipSummary", () => {
  it("omits the category name from selected values", () => {
    expect(filterChipSummary("Status", [])).toBe("Status");
    expect(filterChipSummary("Status", ["Failed"])).toBe("Failed");
    expect(filterChipSummary("Status", ["Failed", "Completed"])).toBe(
      "Failed, Completed",
    );
    expect(filterChipSummary("Source", ["YouTube", "Instagram", "X"])).toBe(
      "3",
    );
  });
});

describe("uniqueFilterOptions", () => {
  it("drops duplicate ids and sorts by label", () => {
    expect(
      uniqueFilterOptions([
        { id: "youtube", label: "YouTube" },
        { id: "instagram", label: "Instagram" },
        { id: "youtube", label: "YouTube" },
      ]),
    ).toEqual([
      { id: "instagram", label: "Instagram" },
      { id: "youtube", label: "YouTube" },
    ]);
  });
});
