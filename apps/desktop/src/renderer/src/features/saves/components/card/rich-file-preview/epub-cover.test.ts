import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractEpubCover } from "./epub-cover";

describe("extractEpubCover", () => {
  it("finds the package cover image and keeps its MIME type", async () => {
    const zip = new JSZip();
    zip.file(
      "META-INF/container.xml",
      '<container><rootfiles><rootfile full-path="OPS/book.opf" /></rootfiles></container>',
    );
    zip.file(
      "OPS/book.opf",
      '<package><metadata><meta name="cover" content="front" /></metadata><manifest><item id="front" href="images/cover.png" media-type="image/png" /></manifest></package>',
    );
    zip.file("OPS/images/cover.png", new Uint8Array([1, 2, 3, 4]));

    const source = await zip.generateAsync({ type: "uint8array" });
    const cover = await extractEpubCover(source);

    expect(cover?.mimeType).toBe("image/png");
    expect(Array.from(cover?.bytes ?? [])).toEqual([1, 2, 3, 4]);
  });

  it("returns null when the EPUB has no declared cover", async () => {
    const zip = new JSZip();
    zip.file(
      "META-INF/container.xml",
      '<container><rootfile full-path="content.opf" /></container>',
    );
    zip.file("content.opf", "<package><manifest /></package>");
    const source = await zip.generateAsync({ type: "uint8array" });

    await expect(extractEpubCover(source)).resolves.toBeNull();
  });
});
