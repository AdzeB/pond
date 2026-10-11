import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { libraryNameFromPath } from "../lib/library-id";

const AccentSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .transform((value) => value.toUpperCase());

const IconSchema = z
  .string()
  .max(1_000_000)
  .refine((value) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(value));

const StoredMetadataSchema = z.looseObject({
  name: z.string().trim().min(1).optional(),
  icon: IconSchema.optional(),
  accent: AccentSchema.optional(),
});

export interface LibraryIdentity {
  name: string;
  icon: string | null;
  accent: string | null;
}

export interface LibraryIdentityPatch {
  name?: string;
  icon?: string | null;
  accent?: string | null;
}

export function readLibraryIdentity(root: string): LibraryIdentity {
  const fallback = libraryNameFromPath(root);
  try {
    const parsed = StoredMetadataSchema.safeParse(
      JSON.parse(readFileSync(join(root, "metadata.json"), "utf8")),
    );
    if (!parsed.success) return { name: fallback, icon: null, accent: null };
    return {
      name: parsed.data.name ?? fallback,
      icon: parsed.data.icon ?? null,
      accent: parsed.data.accent ?? null,
    };
  } catch {
    return { name: fallback, icon: null, accent: null };
  }
}

export function updateLibraryIdentity(
  root: string,
  patch: LibraryIdentityPatch,
): LibraryIdentity {
  const file = join(root, "metadata.json");
  if (!existsSync(file)) throw new Error("Library metadata is missing.");
  const current = JSON.parse(readFileSync(file, "utf8"));
  const parsed = StoredMetadataSchema.parse({
    ...current,
    ...patch,
    icon: patch.icon === null ? undefined : (patch.icon ?? current.icon),
    accent:
      patch.accent === null ? undefined : (patch.accent ?? current.accent),
  });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(parsed, null, 2));
  renameSync(temporary, file);
  return readLibraryIdentity(root);
}
