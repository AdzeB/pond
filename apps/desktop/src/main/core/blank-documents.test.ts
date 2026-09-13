import { readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  listInstalledBlankDocuments,
  writeBlankDocumentFile,
} from "./blank-documents";

const scratch: string[] = [];

afterEach(async () => {
  await Promise.all(
    scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("blank documents", () => {
  it("lists only document types whose apps are installed", () => {
    expect(
      listInstalledBlankDocuments({
        exists: () => true,
        entries: () => ["Adobe Photoshop 2025.app", "Pages.app", "Safari.app"],
      }),
    ).toEqual(["photoshop", "pages"]);
  });

  it("writes a file with the document extension", async () => {
    const path = await writeBlankDocumentFile("word");
    expect(path).toMatch(/Untitled\.docx$/);
    if (path) scratch.push(path.replace(/\/Untitled\.docx$/, ""));
    const bytes = path ? await readFile(path) : Buffer.alloc(0);
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(bytes.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});
