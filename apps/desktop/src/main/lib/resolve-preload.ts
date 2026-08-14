import { existsSync } from "node:fs";
import { basename, join } from "node:path";

/** `out/main/` whether this module was emitted there or under `out/main/chunks/`. */
function mainOutDir(): string {
  return basename(__dirname) === "chunks" ? join(__dirname, "..") : __dirname;
}

/**
 * electron-vite emits preload to `out/preload/` while main code may run from
 * `out/main/` or `out/main/chunks/`; pick the path that exists.
 */
export function resolvePreload(name: "index.cjs" | "scrape.cjs"): string {
  const path = join(mainOutDir(), "../preload", name);
  if (!existsSync(path)) {
    const fallback = join(__dirname, "../preload", name);
    return existsSync(fallback) ? fallback : path;
  }
  return path;
}

/** Paths under `out/` relative to the main build root (e.g. `../renderer/index.html`). */
export function resolveMainOut(...parts: string[]): string {
  return join(mainOutDir(), ...parts);
}
