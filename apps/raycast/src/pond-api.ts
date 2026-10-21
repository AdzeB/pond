import {
  type ApiCursor,
  type ApiLibrary,
  type ApiSave,
  PondApi,
  PondApiError,
} from "@pond/api";
import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";

interface PondPreferences {
  baseUrl: string;
  token: string;
}

export type PondSave = ApiSave;
export type PondLibrary = ApiLibrary;
export type PondCursor = ApiCursor;

export class PondRequestError extends Error {}

function api(): PondApi {
  const preferences = getPreferenceValues<PondPreferences>();
  return new PondApi({
    baseUrl: preferences.baseUrl,
    token: preferences.token,
  });
}

async function request<Result>(operation: () => Promise<Result>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PondApiError && error.kind === "authentication") {
      throw new PondRequestError(
        "Copy a fresh Local API Token from Pond Settings.",
      );
    }
    if (error instanceof PondApiError && error.kind === "connection") {
      throw new PondRequestError("Open Pond and check the Local API URL.");
    }
    throw new PondRequestError(
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
      include: ["saves"],
    }),
  );
  return {
    saves: page.saves ?? [],
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
    throw new PondRequestError("Pond returned an unexpected response.");
  if (!parsed.data.ok)
    throw new PondRequestError(
      COPY_FILE_FAILURES.get(parsed.data.reason ?? "") ??
        "Couldn't copy the file. Try again.",
    );
}

export function fetchThumbnail(id: string) {
  return request(() => api().thumbnail(id, "medium"));
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
    throw new PondRequestError("Enter an http or https URL.");
  }
  return parsed.data;
}
