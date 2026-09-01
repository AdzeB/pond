import {
  MEDIA_TYPES,
  type MediaType,
  SOURCES,
  type Source,
  saves,
} from "@pond/schema/db";
import { buildWhere, type Query } from "@pond/schema/filters";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";
import log from "electron-log/main.js";
import { z } from "zod";
import { type Db, getDb } from "../db";
import {
  cosineSimilarity,
  encodeQueryEmbeddings,
  type QueryEmbeddings,
  reciprocalRankFusion,
} from "./query-embeddings";

export const libraryRetrievalInput = z.object({
  query: z.string().optional(),
  source: z.enum(SOURCES).optional(),
  folderId: z.string().optional(),
  media: z.array(z.enum(MEDIA_TYPES)).max(MEDIA_TYPES.length).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type LibraryRetrievalInput = z.infer<typeof libraryRetrievalInput>;

export interface LibraryRetrievalScope {
  saveIds?: string[];
  folderId?: string;
}

export type RetrievalChannel = "fts" | "text" | "visual" | "recent";

export interface LibraryRetrievalHit {
  id: string;
  title: string | null;
  url: string;
  author: string | null;
  source: Source;
  notes: string | null;
  description: string | null;
  mediaType: MediaType | null;
  savedAt: Date;
  score: number;
  channels: RetrievalChannel[];
}

export interface LibraryRetrievalResult {
  hits: LibraryRetrievalHit[];
  saves: Array<
    Pick<
      LibraryRetrievalHit,
      "id" | "title" | "url" | "author" | "source" | "notes" | "description"
    >
  >;
}

export function toFtsMatchQuery(
  query: string,
  mode: "all" | "any" = "all",
): string | null {
  const tokens = query
    .split(/\s+/)
    .map((token) =>
      token.replaceAll('"', "").replaceAll("'", "").replaceAll("*", "").trim(),
    )
    .filter(Boolean);
  if (!tokens.length) return null;
  return tokens
    .map((token) => `"${token}"*`)
    .join(mode === "any" ? " OR " : " AND ");
}

export function normalizeMedia(media: MediaType[] | undefined): MediaType[] {
  return [...new Set(media ?? [])];
}

export function libraryScopeClauses(scope: LibraryRetrievalScope): SQL[] {
  const clauses: SQL[] = [isNull(saves.deletedAt)];
  if (scope.saveIds) clauses.push(inArray(saves.id, scope.saveIds));
  if (scope.folderId) {
    const compiled = buildWhere({
      combinator: "and",
      rules: [{ field: "folder", operator: "some", value: [scope.folderId] }],
    });
    if (compiled) clauses.push(compiled);
  }
  return clauses;
}

function inputClauses(input: LibraryRetrievalInput): SQL[] {
  const clauses: SQL[] = [];
  if (input.source) clauses.push(eq(saves.source, input.source));
  if (input.folderId) {
    const folderQuery: Query = {
      combinator: "and",
      rules: [{ field: "folder", operator: "some", value: [input.folderId] }],
    };
    const compiled = buildWhere(folderQuery);
    if (compiled) clauses.push(compiled);
  }
  const media = normalizeMedia(input.media);
  if (media.length) {
    const projectedType = sql<string>`case when ${saves.source} = 'web' then 'link' else lower(coalesce(${saves.mediaType}, '')) end`;
    clauses.push(inArray(projectedType, media));
  }
  return clauses;
}

const projection = {
  id: saves.id,
  title: saves.title,
  url: saves.url,
  author: saves.author,
  source: saves.source,
  notes: saves.notes,
  description: saves.description,
  mediaType: saves.mediaType,
  savedAt: saves.savedAt,
};

function publicSaves(
  hits: LibraryRetrievalHit[],
): LibraryRetrievalResult["saves"] {
  return hits.map(({ id, title, url, author, source, notes, description }) => ({
    id,
    title,
    url,
    author,
    source,
    notes,
    description,
  }));
}

function topDenseMatches(
  rows: Array<{ id: string; vector: number[] | null }>,
  query: number[],
  limit = 50,
): string[] {
  const top: Array<{ id: string; score: number }> = [];
  for (const row of rows) {
    if (!row.vector) continue;
    const score = cosineSimilarity(query, row.vector);
    if (score == null || score <= 0) continue;
    const index = top.findIndex((candidate) => candidate.score < score);
    top.splice(index < 0 ? top.length : index, 0, { id: row.id, score });
    if (top.length > limit) top.pop();
  }
  return top.map((row) => row.id);
}

export async function retrieveLibraryWithDb(
  db: Db,
  input: LibraryRetrievalInput,
  scope: LibraryRetrievalScope = {},
  queryEmbeddings: QueryEmbeddings = {},
): Promise<LibraryRetrievalResult> {
  const limit = input.limit ?? 12;
  const clauses = [...libraryScopeClauses(scope), ...inputClauses(input)];
  const query = input.query?.trim() ?? "";
  const match = toFtsMatchQuery(query);
  if (!match) {
    const rows = await db
      .select(projection)
      .from(saves)
      .where(and(...clauses))
      .orderBy(desc(saves.savedAt))
      .limit(limit);
    const hits = rows.map((row, index) => ({
      ...row,
      score: 1 / (index + 1),
      channels: ["recent" as const],
    }));
    return { hits, saves: publicSaves(hits) };
  }

  const candidates = db.$raw
    .prepare(
      `SELECT f.id AS id, bm25(saves_fts, 8.0, 3.0, 2.0, 2.0, 2.0, 1.5, 1.5, 1.0, 1.0) AS rank
       FROM saves_fts f
       WHERE saves_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    )
    .all(match, Math.max(limit * 8, 50)) as Array<{
    id: string;
    rank: number;
  }>;
  const ranked: Array<{ channel: RetrievalChannel; ids: string[] }> = [];
  if (candidates.length) {
    const rows = await db
      .select({ id: saves.id })
      .from(saves)
      .where(
        and(
          ...clauses,
          inArray(
            saves.id,
            candidates.map((row) => row.id),
          ),
        ),
      );
    const admitted = new Set(rows.map((row) => row.id));
    ranked.push({
      channel: "fts",
      ids: candidates
        .map((candidate) => candidate.id)
        .filter((id) => admitted.has(id)),
    });
  }

  const denseChannels = await Promise.all([
    queryEmbeddings.text
      ? db
          .select({ id: saves.id, vector: saves.embedding })
          .from(saves)
          .where(
            and(
              ...clauses,
              eq(saves.embeddingModel, queryEmbeddings.text.model),
              isNotNull(saves.embedding),
            ),
          )
          .then((rows) => ({
            channel: "text" as const,
            ids: topDenseMatches(rows, queryEmbeddings.text?.vector ?? []),
          }))
      : undefined,
    queryEmbeddings.visual
      ? db
          .select({ id: saves.id, vector: saves.clipEmbedding })
          .from(saves)
          .where(
            and(
              ...clauses,
              eq(saves.clipModel, queryEmbeddings.visual.model),
              isNotNull(saves.clipEmbedding),
            ),
          )
          .then((rows) => ({
            channel: "visual" as const,
            ids: topDenseMatches(rows, queryEmbeddings.visual?.vector ?? []),
          }))
      : undefined,
  ]);
  for (const channel of denseChannels) {
    if (channel?.ids.length) ranked.push(channel);
  }

  const channelById = new Map<string, RetrievalChannel[]>();
  for (const list of ranked) {
    for (const id of list.ids) {
      const channels = channelById.get(id) ?? [];
      if (!channels.includes(list.channel)) channels.push(list.channel);
      channelById.set(id, channels);
    }
  }
  const fused = reciprocalRankFusion(ranked.map((list) => list.ids)).slice(
    0,
    Math.max(limit * 4, 50),
  );
  if (!fused.length) return { hits: [], saves: [] };
  const rows = await db
    .select(projection)
    .from(saves)
    .where(
      and(
        ...clauses,
        inArray(
          saves.id,
          fused.map((row) => row.id),
        ),
      ),
    );
  const records = new Map(rows.map((row) => [row.id, row] as const));
  const hits = fused
    .flatMap(({ id, score }) => {
      const row = records.get(id);
      return row
        ? [{ ...row, score, channels: channelById.get(id) ?? [] }]
        : [];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.savedAt.getTime() - left.savedAt.getTime(),
    )
    .slice(0, limit);
  return { hits, saves: publicSaves(hits) };
}

export async function retrieveLibrary(
  input: LibraryRetrievalInput,
  scope: LibraryRetrievalScope = {},
): Promise<LibraryRetrievalResult> {
  const startedAt = Date.now();
  let embeddings: QueryEmbeddings = {};
  if (input.query?.trim()) {
    try {
      embeddings = await encodeQueryEmbeddings(
        input.query,
        normalizeMedia(input.media),
      );
    } catch (error) {
      log.warn("[pond retrieval] dense query encoding unavailable", {
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }
  const result = await retrieveLibraryWithDb(
    await getDb(),
    input,
    scope,
    embeddings,
  );
  log.info("[pond retrieval] complete", {
    queryLength: input.query?.trim().length ?? 0,
    media: normalizeMedia(input.media),
    hits: result.hits.length,
    channels: [...new Set(result.hits.flatMap((hit) => hit.channels))],
    denseText: Boolean(embeddings.text),
    denseVisual: Boolean(embeddings.visual),
    ms: Date.now() - startedAt,
  });
  return result;
}
