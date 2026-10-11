import { describe, expect, it } from "vitest";
import {
  EagleCommentsSchema,
  EagleVideoNotesSchema,
  foldAnnotationsIntoNotes,
} from "./eagle-annotations";

describe("foldAnnotationsIntoNotes", () => {
  it("appends comments, replies, and timestamped video notes after the note", () => {
    expect(
      foldAnnotationsIntoNotes(
        "Saved for the type pairing.",
        EagleCommentsSchema.parse([
          {
            id: "a",
            x: 0.1,
            y: 0.1,
            w: 0.2,
            h: 0.2,
            text: "Headline weight",
            replies: [{ id: "r", text: "Try the condensed cut" }],
          },
        ]),
        EagleVideoNotesSchema.parse([
          { id: "late", timeSec: 3725, text: "Credits" },
          { id: "early", timeSec: 65.5, text: "Logo reveal" },
        ]),
      ),
    ).toBe(
      "Saved for the type pairing.\n\nHeadline weight\nTry the condensed cut\n1:05 Logo reveal\n1:02:05 Credits",
    );
  });

  it("reads Eagle comment and video mark shapes", () => {
    expect(
      foldAnnotationsIntoNotes(
        null,
        EagleCommentsSchema.parse([
          { x: 350, y: 480, width: 380, height: 400, annotation: "Face area" },
        ]),
        EagleVideoNotesSchema.parse([
          { duration: 12, annotation: "Important scene" },
        ]),
      ),
    ).toBe("Face area\n0:12 Important scene");
  });

  it("leaves the note alone when there is nothing to fold", () => {
    expect(foldAnnotationsIntoNotes("Keep", [], undefined)).toBe("Keep");
    expect(
      foldAnnotationsIntoNotes(
        null,
        EagleCommentsSchema.parse([{ text: "  " }]),
        undefined,
      ),
    ).toBeNull();
    expect(
      foldAnnotationsIntoNotes(
        null,
        EagleCommentsSchema.parse("not a list"),
        EagleVideoNotesSchema.parse(null),
      ),
    ).toBeNull();
  });
});
