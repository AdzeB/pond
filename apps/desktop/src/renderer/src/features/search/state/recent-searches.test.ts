import { beforeEach, expect, it } from "vitest";
import {
  clearRecentSearches,
  recentSearchesSnapshot,
  recordRecentSearch,
  removeRecentSearch,
} from "./recent-searches";

beforeEach(() => clearRecentSearches());

it("keeps five unique recent searches with the newest first", () => {
  for (const search of ["one", "two", "three", "four", "five", "six"])
    recordRecentSearch(search);
  expect(recentSearchesSnapshot()).toEqual([
    "six",
    "five",
    "four",
    "three",
    "two",
  ]);
  recordRecentSearch("FOUR");
  expect(recentSearchesSnapshot()).toEqual([
    "FOUR",
    "six",
    "five",
    "three",
    "two",
  ]);
});

it("removes individual searches", () => {
  recordRecentSearch("design");
  recordRecentSearch("photos");
  removeRecentSearch("design");
  expect(recentSearchesSnapshot()).toEqual(["photos"]);
});
