import type { Save } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import { migrateLibraryScope } from "./library-scope-migration";

describe("library scope migration", () => {
  it("retains file saves while repairing legacy media types and missing site names", () => {
    const updates: Array<{
      id: string;
      patch: Pick<Partial<Save>, "mediaType" | "siteName">;
    }> = [];
    migrateLibraryScope({
      fileSaveIds: () => [{ id: "local-archive" }],
      mixedSaves: () => [{ id: "legacy-mixed", files: [] }],
      textSaves: () => [
        {
          id: "text-with-thumb",
          source: "local",
          description: "Keep this note",
          files: [
            {
              kind: "thumbnail",
              path: "thumbnail.png",
              mimeType: "image/png",
              sha256: "x",
              size: 1,
            },
          ],
          rawJson: null,
        },
        {
          id: "web-text",
          source: "web",
          description: "An article",
          files: [],
          rawJson: null,
        },
      ],
      missingSiteNames: () => [
        { id: "web-text", url: "https://example.com/article" },
      ],
      updateSave: (id, patch) => {
        updates.push({ id, patch });
      },
    });
    expect(updates).toEqual([
      { id: "legacy-mixed", patch: { mediaType: "image" } },
      { id: "web-text", patch: { mediaType: "link" } },
      { id: "web-text", patch: { siteName: "example.com" } },
    ]);
  });
});
