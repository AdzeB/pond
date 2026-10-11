import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, it } from "vitest";
import {
  activateFont,
  backfillFontActivationIndex,
  deactivateFont,
} from "./font-activation";

it("installs a font into the Pond fonts directory and removes it", async () => {
  const root = await mkdtemp(join(tmpdir(), "pond-fonts-"));
  const source = join(root, "SourceSerif.ttf");
  await writeFile(source, Buffer.from("font"));
  const fontsDir = join(root, "Fonts");
  const activated = await activateFont({
    sourcePath: source,
    saveId: "save-1",
    fontsDir,
  });
  if (!activated.ok) throw new Error(activated.error);
  expect(activated.path.startsWith(join(fontsDir, "Pond"))).toBe(true);
  expect(await readFile(activated.path, "utf8")).toBe("font");
  const deactivated = await deactivateFont({
    installedPath: activated.path,
    fontsDir,
  });
  expect(deactivated.ok).toBe(true);
  await expect(readFile(activated.path)).rejects.toThrow();
});

it("backfills indexed activation from existing sidecars", () => {
  const db = new Database(":memory:");
  db.exec(
    "CREATE TABLE saves (id TEXT PRIMARY KEY, media_type TEXT, font_activated INTEGER)",
  );
  db.prepare(
    "INSERT INTO saves (id, media_type, font_activated) VALUES (?, ?, ?)",
  ).run("active-font", "font", 0);
  db.prepare(
    "INSERT INTO saves (id, media_type, font_activated) VALUES (?, ?, ?)",
  ).run("inactive-font", "font", 0);
  db.prepare(
    "INSERT INTO saves (id, media_type, font_activated) VALUES (?, ?, ?)",
  ).run("image", "image", 0);

  expect(
    backfillFontActivationIndex(db, (id) =>
      id === "active-font" ? "/fonts/active.ttf" : null,
    ),
  ).toBe(1);
  expect(
    db
      .prepare("SELECT font_activated FROM saves WHERE id = ?")
      .get("active-font"),
  ).toEqual({ font_activated: 1 });
  expect(
    db
      .prepare("SELECT font_activated FROM saves WHERE id = ?")
      .get("inactive-font"),
  ).toEqual({ font_activated: 0 });
  db.close();
});

it("refuses to delete a file outside the Pond fonts directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "pond-fonts-"));
  const outside = join(root, "system.ttf");
  await writeFile(outside, "keep");
  const result = await deactivateFont({
    installedPath: outside,
    fontsDir: join(root, "Fonts"),
  });
  expect(result.ok).toBe(false);
  expect(await readFile(outside, "utf8")).toBe("keep");
});
