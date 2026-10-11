import { existsSync, rmSync } from "node:fs";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import type { OkResult } from "@shared/query-contracts-shared";
import type Database from "better-sqlite3";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { saveDir } from "../paths";

export async function activateFont(input: {
  sourcePath: string;
  saveId: string;
  fontsDir: string;
}): Promise<OkResult<{ path: string }>> {
  const pondDir = join(input.fontsDir, "Pond");
  const extension = extname(input.sourcePath) || ".ttf";
  const dest = join(pondDir, `${input.saveId}${extension}`);
  try {
    await mkdir(pondDir, { recursive: true });
    await copyFile(input.sourcePath, dest);
    return { ok: true, path: dest };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "activate_failed",
    };
  }
}

export async function deactivateFont(input: {
  installedPath: string;
  fontsDir: string;
}): Promise<OkResult> {
  const pondDir = resolve(join(input.fontsDir, "Pond"));
  const target = resolve(input.installedPath);
  if (target === pondDir || !target.startsWith(`${pondDir}${sep}`))
    return { ok: false, error: "outside_pond_fonts" };
  try {
    await rm(target, { force: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "deactivate_failed",
    };
  }
}

export function pondFontsDir(
  home: string,
  platform = process.platform,
): string {
  if (platform === "darwin") return join(home, "Library", "Fonts");
  if (platform === "win32")
    return join(home, "AppData", "Local", "Microsoft", "Windows", "Fonts");
  return join(home, ".local", "share", "fonts");
}

function sidecarPath(id: string): string {
  return join(saveDir(id), "font-activation.json");
}

export function readFontActivation(id: string): string | null {
  return readBundleJson<{ path: string }>(sidecarPath(id))?.data.path ?? null;
}

export function writeFontActivation(id: string, path: string): void {
  writeBundleJson(sidecarPath(id), { path });
}

export function clearFontActivation(id: string): void {
  if (existsSync(sidecarPath(id))) rmSync(sidecarPath(id), { force: true });
}

export function backfillFontActivationIndex(
  db: Database.Database,
  activationFor: (id: string) => string | null = readFontActivation,
): number {
  const rows = db
    .prepare<[], { id: string }>(
      "SELECT id FROM saves WHERE media_type = 'font' AND COALESCE(font_activated, 0) = 0",
    )
    .all();
  const update = db.prepare("UPDATE saves SET font_activated = 1 WHERE id = ?");
  let updated = 0;
  db.transaction(() => {
    for (const row of rows) {
      if (!activationFor(row.id)) continue;
      updated += update.run(row.id).changes;
    }
  })();
  return updated;
}
