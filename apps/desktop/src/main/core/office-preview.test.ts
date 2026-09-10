import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { extractOfficePreview } from "./office-preview";

const jpeg = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex");

it("reads docProps/thumbnail.jpeg from a docx zip", async () => {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
  );
  zip.file("docProps/thumbnail.jpeg", jpeg);
  const root = await mkdtemp(join(tmpdir(), "pond-office-"));
  const path = join(root, "deck.docx");
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer" }));
  const preview = await extractOfficePreview(path);
  expect(preview?.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))).toBe(true);
});

it("returns null for a zip without a thumbnail", async () => {
  const zip = new JSZip();
  zip.file("word/document.xml", "<w:document/>");
  const root = await mkdtemp(join(tmpdir(), "pond-office-"));
  const path = join(root, "plain.docx");
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer" }));
  expect(await extractOfficePreview(path)).toBeNull();
});
