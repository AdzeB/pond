import { normalizeSidebarDestinationOrder } from "@pond/schema";
import { expect, it } from "vitest";
import {
  moveSidebarDestination,
  moveVisibleSidebarDestination,
} from "./sidebar-customization";

const LIBRARY_DESTINATIONS = [
  "all",
  "uncategorized",
  "assistant",
  "untagged",
  "recentlyUsed",
  "tags",
  "random",
  "trash",
] as const;

it("places a newly added destination in its default relative position", () => {
  expect(
    normalizeSidebarDestinationOrder([
      "all",
      "uncategorized",
      "untagged",
      "recentlyUsed",
      "tags",
      "random",
      "trash",
      "downloads",
      "sources",
    ]),
  ).toEqual([...LIBRARY_DESTINATIONS, "downloads", "sources"]);
});

it("reorders one sidebar group without moving destinations across groups", () => {
  expect(
    moveSidebarDestination(
      [...LIBRARY_DESTINATIONS, "downloads", "sources"],
      LIBRARY_DESTINATIONS,
      "tags",
      1,
    ),
  ).toEqual([
    "all",
    "tags",
    "uncategorized",
    "assistant",
    "untagged",
    "recentlyUsed",
    "random",
    "trash",
    "downloads",
    "sources",
  ]);
});

it("leaves an unknown group move unchanged", () => {
  expect(
    moveSidebarDestination(
      ["all", "downloads", "sources"],
      ["downloads", "sources"],
      "all",
      1,
    ),
  ).toEqual(["all", "downloads", "sources"]);
});

it("reorders visible sidebar destinations while preserving hidden slots", () => {
  expect(
    moveVisibleSidebarDestination(
      [...LIBRARY_DESTINATIONS, "downloads", "sources"],
      LIBRARY_DESTINATIONS,
      [
        "all",
        "assistant",
        "untagged",
        "recentlyUsed",
        "tags",
        "random",
        "trash",
      ],
      "all",
      "tags",
    ),
  ).toEqual([
    "assistant",
    "uncategorized",
    "untagged",
    "recentlyUsed",
    "tags",
    "all",
    "random",
    "trash",
    "downloads",
    "sources",
  ]);
});

it("leaves an unknown visible sidebar move unchanged", () => {
  expect(
    moveVisibleSidebarDestination(
      [...LIBRARY_DESTINATIONS, "downloads", "sources"],
      LIBRARY_DESTINATIONS,
      LIBRARY_DESTINATIONS,
      "downloads",
      "tags",
    ),
  ).toEqual([...LIBRARY_DESTINATIONS, "downloads", "sources"]);
});
