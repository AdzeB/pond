import { afterEach, describe, expect, it } from "vitest";
import {
  clearLibraryKey,
  deriveLibrarySubkey,
  installLibraryKey,
  libraryKeyInstalled,
} from "./library-key-runtime";

afterEach(() => clearLibraryKey());

describe("Library key runtime", () => {
  it("derives stable, purpose-separated keys", () => {
    installLibraryKey("library-id", Buffer.alloc(32, 7));

    const index = deriveLibrarySubkey("database:index");
    const files = deriveLibrarySubkey("files");
    const repeated = deriveLibrarySubkey("database:index");

    expect(index).toEqual(repeated);
    expect(index).not.toEqual(files);
    expect(libraryKeyInstalled("library-id")).toBe(true);

    index.fill(0);
    files.fill(0);
    repeated.fill(0);
  });

  it("clears the legacy key when the Library closes", () => {
    installLibraryKey("library-id", Buffer.alloc(32, 7));
    clearLibraryKey();

    expect(libraryKeyInstalled()).toBe(false);
    expect(() => deriveLibrarySubkey("files")).toThrow(
      "The legacy Library key is unavailable",
    );
  });
});
