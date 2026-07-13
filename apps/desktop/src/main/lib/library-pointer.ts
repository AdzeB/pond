import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { app } from "electron";

/** Side-car in userData pointing at the user's library folder; read before the DB opens. */
const POINTER_FILE = "library-location.json";

interface PointerFile {
  path: string;
  updatedAt: number;
  schemaVersion: 1;
}

function pointerPath(): string {
  return join(app.getPath("userData"), POINTER_FILE);
}

export function readLibraryPointer(): string | null {
  try {
    const raw = readFileSync(pointerPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<PointerFile>;
    const candidate = parsed?.path;
    if (typeof candidate !== "string" || candidate.length === 0) return null;
    const abs = isAbsolute(candidate) ? candidate : resolve(candidate);
    /** Refuse a pointer into userData: it would recurse (library inside its metadata). */
    if (abs.startsWith(`${app.getPath("userData")}/`)) return null;
    return abs;
  } catch {
    return null;
  }
}

export function writeLibraryPointer(absPath: string): void {
  if (!isAbsolute(absPath)) {
    throw new Error("library pointer requires an absolute path");
  }
  const body: PointerFile = {
    path: absPath,
    updatedAt: Date.now(),
    schemaVersion: 1,
  };
  const file = pointerPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(body, null, 2));
}

/** Reports whether `target` is safe as a library root: exists or creatable, outside userData. */
interface PointerSafetyReport {
  ok: boolean;
  reason?:
    | "inside_user_data"
    | "not_writable"
    | "not_a_directory"
    | "unknown_error";
}

export function checkPointerSafety(target: string): PointerSafetyReport {
  const abs = isAbsolute(target) ? target : resolve(target);
  if (abs.startsWith(`${app.getPath("userData")}/`)) {
    return { ok: false, reason: "inside_user_data" };
  }
  try {
    if (existsSync(abs)) {
      const st = statSync(abs);
      if (!st.isDirectory()) return { ok: false, reason: "not_a_directory" };
    } else {
      mkdirSync(abs, { recursive: true });
    }
    /** Probe-write to catch read-only mounts and sandboxed paths. */
    const probe = join(abs, `.pond-probe-${Date.now()}`);
    writeFileSync(probe, "ok");
    try {
      readFileSync(probe);
    } finally {
      try {
        const { unlinkSync } = require("node:fs") as typeof import("node:fs");
        unlinkSync(probe);
      } catch {}
    }
    return { ok: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "EACCES") {
      return { ok: false, reason: "not_writable" };
    }
    return { ok: false, reason: "unknown_error" };
  }
}
