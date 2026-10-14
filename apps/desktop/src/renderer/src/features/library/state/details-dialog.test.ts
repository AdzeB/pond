import { afterEach, describe, expect, it } from "vitest";
import { detailsDialog } from "./details-dialog";
import { libraryChrome } from "./library-chrome";

describe("details dialog", () => {
  afterEach(() => detailsDialog.close());

  it("opens source details without touching the right pane", () => {
    const before = libraryChrome.getState();
    detailsDialog.openSource("account", "acc-1");
    expect(detailsDialog.getState()).toEqual({
      kind: "source",
      sourceKind: "account",
      id: "acc-1",
    });
    expect(libraryChrome.getState()).toEqual(before);
  });

  it("closes the open details", () => {
    detailsDialog.openSource("watch", "watch-1");
    detailsDialog.close();
    expect(detailsDialog.getState()).toBeNull();
  });
});
