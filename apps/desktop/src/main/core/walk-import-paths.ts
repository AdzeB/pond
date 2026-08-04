import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";

/** Recursively expand files and directories into absolute file paths; skips hidden/dot entries. */
export async function walkImportPaths(
  paths: readonly string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    await walkOne(path, out);
  }
  return out;
}

async function walkOne(path: string, out: string[]): Promise<void> {
  const name = basename(path);
  if (name.startsWith(".")) return;

  let info: Awaited<ReturnType<typeof stat>>;
  try {
    info = await stat(path);
  } catch {
    return;
  }

  if (info.isFile()) {
    if (info.size > 0) out.push(path);
    return;
  }
  if (!info.isDirectory()) return;

  let entries: Dirent[];
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      await walkOne(child, out);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      if ((await stat(child)).size > 0) out.push(child);
    } catch {
      /* skip unreadable */
    }
  }
}
