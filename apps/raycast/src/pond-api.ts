import {
  type LocalApiCursor,
  type LocalApiLibrary,
  type LocalApiSave,
  PondLocalApi,
  PondLocalApiError,
} from "@pond/local-api";
import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";

interface PondPreferences {
  baseUrl: string;
  token: string;
}

export type PondSave = LocalApiSave;
export type PondLibrary = LocalApiLibrary;
export type PondCursor = LocalApiCursor;

export class PondApiError extends Error {}

function api(): PondLocalApi {
  const preferences = getPreferenceValues<PondPreferences>();
  return new PondLocalApi({
    baseUrl: preferences.baseUrl,
    token: preferences.token,
  });
}

async function request<Result>(operation: () => Promise<Result>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PondLocalApiError && error.kind === "authentication") {
      throw new PondApiError(
        "Copy a fresh Local API Token from Pond Settings.",
      );
    }
    if (error instanceof PondLocalApiError && error.kind === "connection") {
      throw new PondApiError("Open Pond and check the Local API URL.");
    }
    throw new PondApiError(
      error instanceof Error ? error.message : "Pond returned an error.",
    );
  }
}

export async function searchLibrary(
  keywords: string,
  cursor: PondCursor | null,
  source: string | null,
): Promise<{
  saves: PondSave[];
  total: number;
  nextCursor: PondCursor | null;
  libraryId: string;
}> {
  const page = await request(() =>
    api().query({
      query: { combinator: "and", rules: [] },
      keywords: keywords.trim() || undefined,
      scope: source ? { source } : undefined,
      cursor,
      limit: 50,
      sortKey: "savedAt",
      sortDir: "desc",
    }),
  );
  if (page.ids.length === 0) {
    return {
      saves: [],
      total: page.total,
      nextCursor: page.nextCursor,
      libraryId: page.libraryId,
    };
  }

  const rows = await request(() => api().saves({ ids: page.ids }));
  const byId = new Map(rows.map((save) => [save.id, save]));
  return {
    saves: page.ids.flatMap((id) => {
      const save = byId.get(id);
      return save ? [save] : [];
    }),
    total: page.total,
    nextCursor: page.nextCursor,
    libraryId: page.libraryId,
  };
}

const CopyFileResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
});

const COPY_FILE_FAILURES = new Map([
  ["no_files", "This Save has no file to copy."],
  ["missing", "The file is missing from your Library."],
  ["not_found", "This Save is no longer in your Library."],
]);

export async function copySaveFile(id: string): Promise<void> {
  const args = { id, fileIndex: 0 };
  const result = await request(async () => {
    const preview = await api().previewOperation("saves.copyFile", args);
    return api().runOperation("saves.copyFile", args, preview.token);
  });
  const parsed = CopyFileResultSchema.safeParse(result);
  if (!parsed.success)
    throw new PondApiError("Pond returned an unexpected response.");
  if (!parsed.data.ok)
    throw new PondApiError(
      COPY_FILE_FAILURES.get(parsed.data.reason ?? "") ??
        "Couldn't copy the file. Try again.",
    );
}

export function fetchThumbnail(id: string) {
  return request(() => api().thumbnail(id));
}

export function enqueueUrl(url: string) {
  return request(() => api().enqueue({ url, trigger: "raycast" }));
}

export function listRecentLibraries() {
  return request(() => api().libraries());
}

export function switchLibrary(path: string) {
  return request(() => api().switchLibrary(path));
}

export function itemLink(libraryId: string, saveId: string): string {
  const url = new URL(`pond://item/${encodeURIComponent(saveId)}`);
  url.searchParams.set("library", libraryId);
  return url.toString();
}

export function validatedUrl(value: string): string {
  const parsed = z.string().trim().url().safeParse(value);
  if (!parsed.success || !/^https?:/.test(parsed.data)) {
    throw new PondApiError("Enter an http or https URL.");
  }
  return parsed.data;
}
