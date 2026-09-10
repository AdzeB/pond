import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { activateFont, deactivateFont } from "./font-activation";

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
  expect(activated.ok).toBe(true);
  expect(activated.path?.startsWith(join(fontsDir, "Pond"))).toBe(true);
  expect(await readFile(activated.path ?? "", "utf8")).toBe("font");
  const deactivated = await deactivateFont({
    installedPath: activated.path ?? "",
    fontsDir,
  });
  expect(deactivated.ok).toBe(true);
  await expect(readFile(activated.path ?? "")).rejects.toThrow();
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
