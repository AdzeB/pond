import { expect, it } from "vitest";
import { duplicateGroups } from "./duplicate-groups";

const file = (hash: string, kind = "image") => ({
  kind,
  path: `${hash}.png`,
  sha256: hash,
  size: 1,
});
it("requires the same complete originals, ignoring decorative files", () => {
  const result = duplicateGroups([
    { id: "one", files: [file("a"), file("b")], phash: null },
    {
      id: "two",
      files: [file("b"), file("a"), file("avatar", "avatar")],
      phash: null,
    },
    { id: "shared-first", files: [file("a"), file("c")], phash: null },
  ]);
  expect(result.groups).toEqual([{ kind: "exact", ids: ["one", "two"] }]);
});
it("separates nearby perceptual hashes from exact byte matches without grouping distant hashes", () => {
  const result = duplicateGroups([
    { id: "one", files: [file("a")], phash: "0000000000000000" },
    { id: "near", files: [file("b")], phash: "000000000000000f" },
    { id: "far", files: [file("c")], phash: "ffffffffffffffff" },
    { id: "invalid", files: [file("d")], phash: "not-a-hash" },
  ]);
  expect(result.groups).toEqual([{ kind: "similar", ids: ["one", "near"] }]);
  expect(result.visualIndexed).toBe(3);
  expect(result.total).toBe(4);
});
it("does not duplicate exact groups in the similar review", () => {
  expect(
    duplicateGroups([
      { id: "one", files: [file("a")], phash: "0000000000000000" },
      { id: "two", files: [file("a")], phash: "0000000000000000" },
    ]).groups,
  ).toEqual([{ kind: "exact", ids: ["one", "two"] }]);
});
