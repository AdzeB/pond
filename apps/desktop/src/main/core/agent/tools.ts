import { saves } from "@pond/schema/db";
import { isEmptyQuery, type Query } from "@pond/schema/filters";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { IPC } from "../../../shared/constants";
import { getDb } from "../../db";
import { broadcast } from "../../lib/broadcast";
import { listFolders } from "../folders";
import {
  type LibraryRetrievalScope,
  libraryRetrievalInput,
  libraryScopeClauses,
  retrieveLibrary,
} from "../library-retrieval";

export const searchLibraryInput = libraryRetrievalInput;

export const readSaveInput = z.object({
  id: z.string(),
});

export const applyFilterInput = z.object({
  query: z.unknown(),
});

export const citeSavesInput = z.object({
  ids: z.array(z.string()).min(1).max(24),
});

export const listFoldersInput = z.object({});

export const openSaveInput = z.object({
  id: z.string(),
});

export type LibraryScope = LibraryRetrievalScope;

export async function searchLibrary(
  input: z.infer<typeof searchLibraryInput>,
  scope: LibraryScope = {},
) {
  const result = await retrieveLibrary(input, scope);
  return { saves: result.saves };
}

export async function readSave(
  input: z.infer<typeof readSaveInput>,
  scope: LibraryScope = {},
) {
  const db = await getDb();
  const rows = await db
    .select({
      id: saves.id,
      title: saves.title,
      url: saves.url,
      author: saves.author,
      source: saves.source,
      description: saves.description,
      notes: saves.notes,
      tags: saves.tags,
    })
    .from(saves)
    .where(and(eq(saves.id, input.id), ...libraryScopeClauses(scope)))
    .limit(1);
  const save = rows[0];
  if (!save) return { error: "Save not found." };
  return { save };
}

export async function applyFilter(input: z.infer<typeof applyFilterInput>) {
  const query = (input.query ?? EMPTY_QUERY) as Query;
  if (isEmptyQuery(query) && input.query == null) {
    return { ok: false, error: "Pass a filter query." };
  }
  broadcast(IPC.agentFilter, query);
  return { ok: true };
}

export async function citeSaves(input: z.infer<typeof citeSavesInput>) {
  broadcast(IPC.agentCite, input.ids);
  return { ok: true, ids: input.ids };
}

export async function listLibraryFolders() {
  const folders = await listFolders();
  return {
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
    })),
  };
}

export async function openSave(input: z.infer<typeof openSaveInput>) {
  broadcast(IPC.nav, `/save/${input.id}`);
  return { ok: true };
}
