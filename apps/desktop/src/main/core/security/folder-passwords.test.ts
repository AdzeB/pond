import { describe, expect, it } from "vitest";
import {
  computeLockedFolderIds,
  createFolderPasswordVerifier,
  verifyFolderPassword,
} from "./folder-passwords";

describe("folder passwords", () => {
  it("stores a salted verifier and rejects the wrong password", async () => {
    const verifier = await createFolderPasswordVerifier("correct horse");

    expect(verifier.hash).not.toContain("correct horse");
    await expect(verifyFolderPassword("correct horse", verifier)).resolves.toBe(
      true,
    );
    await expect(verifyFolderPassword("wrong", verifier)).resolves.toBe(false);
  });

  it("locks descendants until the protected ancestor is unlocked", () => {
    const verifier = {
      algorithm: "scrypt" as const,
      version: 1 as const,
      salt: "salt",
      hash: "hash",
      N: 2,
      r: 1,
      p: 1,
    };
    const rows = [
      {
        id: "protected",
        parentId: null,
        passwordVerifier: verifier,
        lockChildren: true,
      },
      {
        id: "child",
        parentId: "protected",
        passwordVerifier: null,
        lockChildren: true,
      },
    ];

    expect([...computeLockedFolderIds(rows)].sort()).toEqual([
      "child",
      "protected",
    ]);
    expect(computeLockedFolderIds(rows, new Set(["protected"]))).toEqual(
      new Set(),
    );
  });
});
