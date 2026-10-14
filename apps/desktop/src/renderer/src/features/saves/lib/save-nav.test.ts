// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@/app/effects/save-library-bridge";
import { libraryChrome } from "@/features/library";
import { primarySelection } from "@/features/saves/state/selection";
import { openSave } from "./save-nav";

describe("openSave", () => {
  beforeEach(() => {
    libraryChrome.inspectSave(null);
    libraryChrome.setAgentOpen(false);
    libraryChrome.closeRightPane();
    primarySelection.set(null);
  });

  afterEach(() => {
    libraryChrome.inspectSave(null);
    libraryChrome.setAgentOpen(false);
    primarySelection.set(null);
  });

  it("shows Details when opening an already selected save", () => {
    libraryChrome.setInspectorSaveId("first");
    libraryChrome.setAgentOpen(true);

    openSave("first");

    expect(primarySelection.get()).toBe("first");
    expect(libraryChrome.getState()).toMatchObject({
      inspectorSaveId: "first",
      rightPane: "inspector",
    });
  });
});
