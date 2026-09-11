import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";

const RecentLibrariesSchema = z.array(
  z.object({ path: z.string(), lastOpened: z.number() }),
);
function readHistory(file: string) {
  if (!existsSync(file)) return [];
  return RecentLibrariesSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}
export function recordRecentLibrary(
  file: string,
  path: string,
  now = Date.now(),
): void {
  const normalized = resolve(path);
  const previous = readHistory(file);
  const history = [
    { path: normalized, lastOpened: now },
    ...previous.filter((entry) => entry.path !== normalized),
  ].slice(0, 12);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(history, null, 2));
  renameSync(`${file}.tmp`, file);
}
export async function listRecentLibraries(file: string, activePath: string) {
  const active = resolve(activePath);
  const history = readHistory(file);
  if (!history.some((entry) => entry.path === active))
    history.unshift({ path: active, lastOpened: 0 });
  return Promise.all(
    history.map(async (entry) => ({
      ...entry,
      name: basename(entry.path).replace(/\.pond$/i, ""),
      active: entry.path === active,
      available: Boolean(
        await stat(join(entry.path, "metadata.json")).catch(() => null),
      ),
    })),
  );
}
