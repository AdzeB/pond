import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  DEFAULT_LIBRARY_NAME,
  LIBRARY_SCHEMA_VERSION,
} from "../../shared/constants";

export const UNBOUND_POND_ID = "unbound";

interface LibraryMetadata {
  id: string;
  name: string;
  createdAt: number;
  schemaVersion: number;
  appVersion: string;
}

export function resolvePondId(root: string, committed: boolean): string {
  if (committed && existsSync(root)) {
    const id = readOrCreatePondId(root);
    if (id) return id;
  }
  return UNBOUND_POND_ID;
}

const StoredMetadataSchema = z.object({ id: z.string().min(1) });

export function readOrCreatePondId(root: string): string {
  const file = join(root, "metadata.json");
  try {
    const parsed = StoredMetadataSchema.safeParse(
      JSON.parse(readFileSync(file, "utf-8")),
    );
    if (parsed.success) return parsed.data.id;
  } catch {}
  const body: LibraryMetadata = {
    id: randomId(),
    name: DEFAULT_LIBRARY_NAME,
    createdAt: Date.now(),
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    appVersion: process.env.npm_package_version ?? "0.0.1",
  };
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(file, JSON.stringify(body, null, 2));
  } catch {}
  return body.id;
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
