import { expect, it } from "vitest";
import { librarySaveLink, linkMatchesLibrary } from "./library-links";

it("encodes library identity separately and refuses an identically named item in another library", () => {
  const link = new URL(librarySaveLink("original library", "save-id"));
  expect(link.searchParams.get("library")).toBe("original library");
  expect(linkMatchesLibrary(link, "original library")).toBe(true);
  expect(linkMatchesLibrary(link, "another library")).toBe(false);
  expect(
    linkMatchesLibrary(new URL("pond://item/legacy"), "current library"),
  ).toBe(true);
});
