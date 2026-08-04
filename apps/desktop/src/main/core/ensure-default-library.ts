import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import log from "electron-log/main.js";
import {
  DEFAULT_LIBRARY_NAME,
  LIBRARY_SCHEMA_VERSION,
} from "../../shared/constants";
import {
  checkPointerSafety,
  readLibraryPointer,
  writeLibraryPointer,
} from "../lib/library-pointer";
import { invalidatePaths, resolvePaths } from "../paths";

export type CreatePondResult =
  | { ok: true; path: string }
  | {
      ok: false;
      reason:
        | "no_path"
        | "inside_user_data"
        | "not_writable"
        | "not_a_directory"
        | "unknown_error";
    };

/** Creates a fresh `.pond` bundle at `parentDir/name.pond`, writes the pointer, and resolves paths. */
export function createPondBundle(
  parentDir: string,
  name: string = DEFAULT_LIBRARY_NAME,
): CreatePondResult {
  const trimmedParent = parentDir.trim();
  if (!trimmedParent) return { ok: false, reason: "no_path" };

  const safeName = name.trim() || DEFAULT_LIBRARY_NAME;
  const bundlePath = ensurePondSuffix(join(trimmedParent, safeName));
  const safety = checkPointerSafety(bundlePath);
  if (!safety.ok) {
    return { ok: false, reason: safety.reason ?? "unknown_error" };
  }

  mkdirSync(join(bundlePath, "items"), { recursive: true });
  mkdirSync(join(bundlePath, "trash"), { recursive: true });

  const metadataFile = join(bundlePath, "metadata.json");
  if (!existsSync(metadataFile)) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    writeFileSync(
      metadataFile,
      JSON.stringify(
        {
          id,
          name: safeName,
          createdAt: Date.now(),
          schemaVersion: LIBRARY_SCHEMA_VERSION,
          appVersion: process.env.npm_package_version ?? "0.1.0",
        },
        null,
        2,
      ),
    );
  }

  writeLibraryPointer(bundlePath);
  invalidatePaths();
  resolvePaths(bundlePath);

  log.info("[pond library-ops] created new pond at", bundlePath);
  return { ok: true, path: bundlePath };
}

/**
 * First boot with no library pointer: adopt an existing default bundle, or create
 * `~/Pond/My Pond.pond`. Must run before `getDb()` so the pond id is committed.
 */
export function ensureDefaultLibrary(): void {
  if (readLibraryPointer()) return;

  const parentDir = join(app.getPath("home"), "Pond");
  const defaultRoot = join(parentDir, `${DEFAULT_LIBRARY_NAME}.pond`);

  if (existsSync(defaultRoot)) {
    writeLibraryPointer(defaultRoot);
    invalidatePaths();
    resolvePaths(defaultRoot);
    log.info("[pond library-ops] adopted existing default pond", defaultRoot);
    return;
  }

  const result = createPondBundle(parentDir, DEFAULT_LIBRARY_NAME);
  if (!result.ok) {
    log.error(
      "[pond library-ops] failed to create default pond",
      result.reason,
    );
  }
}

function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}
