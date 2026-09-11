import { describe, expect, it } from "vitest";
import {
  applyPatchToInfo,
  patchTouchesInfo,
  StoredInfoDocSchema,
} from "./library-format";

describe("portable save metadata", () => {
  it("stores and clears annotations, ratings and transforms without changing original refs", () => {
    const info = StoredInfoDocSchema.parse({
      id: "save",
      files: [
        { path: "original.png", kind: "image", sha256: "hash", size: 42 },
      ],
      folderIds: ["project"],
    });
    const changed = applyPatchToInfo(info, {
      rating: 4,
      comments: [{ id: "comment", x: 0, y: 0, w: 1, h: 1, text: "Reference" }],
      videoNotes: [{ id: "note", timeSec: 12, text: "frame" }],
      rotate: 90,
      crop: { x: 0, y: 0, w: 0.5, h: 0.5 },
    });
    expect(StoredInfoDocSchema.parse(changed).userData?.rating).toBe(4);
    expect(changed.files).toEqual(info.files);
    expect(changed.folderIds).toEqual(["project"]);
    const cleared = applyPatchToInfo(changed, {
      rating: null,
      comments: [],
      videoNotes: [],
      crop: null,
    });
    expect(cleared.userData).toMatchObject({
      rating: null,
      comments: [],
      videoNotes: [],
      crop: null,
      rotate: 90,
    });
    expect(patchTouchesInfo({ comments: [] })).toBe(true);
  });
});
