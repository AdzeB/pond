import type { QueryResult } from "@shared/query-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openExistingLibrary } from "./apply";

type LibraryQuery = "library.pickExisting" | "library.switchTo";

function stubQuery(
  results: {
    [Name in LibraryQuery]?: QueryResult<Name>;
  },
) {
  const query = vi.fn(async (name: LibraryQuery) => results[name]);
  vi.stubGlobal("window", { pond: { query } });
  return query;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openExistingLibrary", () => {
  it("switches to the picked Library", async () => {
    const query = stubQuery({
      "library.pickExisting": { ok: true, path: "/Volumes/Archive/Ada.pond" },
      "library.switchTo": { ok: true, path: "/Volumes/Archive/Ada.pond" },
    });
    await expect(openExistingLibrary()).resolves.toBe("");
    expect(query).toHaveBeenCalledWith("library.switchTo", {
      path: "/Volumes/Archive/Ada.pond",
    });
  });

  it("does nothing when the picker is cancelled", async () => {
    const query = stubQuery({
      "library.pickExisting": { ok: false, reason: "cancelled" },
    });
    await expect(openExistingLibrary()).resolves.toBeNull();
    expect(query).not.toHaveBeenCalledWith("library.switchTo", {
      path: expect.anything(),
    });
  });

  it("surfaces why the folder couldn't be opened", async () => {
    stubQuery({
      "library.pickExisting": { ok: true, path: "/Users/ada/Downloads" },
      "library.switchTo": { ok: false, error: "Not a Pond library." },
    });
    await expect(openExistingLibrary()).resolves.toBe("Not a Pond library.");
  });
});
