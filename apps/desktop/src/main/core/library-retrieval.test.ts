import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import {
  normalizeMedia,
  retrieveLibraryWithDb,
  toFtsMatchQuery,
} from "./library-retrieval";

const dialect = new SQLiteSyncDialect();

function fakeDb(input: {
  candidates?: Array<{ id: string; rank: number }>;
  knnClip?: Array<{ id: string; distance: number }>;
  knnText?: Array<{ id: string; distance: number }>;
  rows?: Array<Record<string, unknown>>;
}) {
  const where = vi.fn();
  const rows = input.rows ?? [];
  const selected = {
    where: (condition: unknown) => {
      where(condition);
      return Object.assign(Promise.resolve(rows), {
        orderBy: () => ({ limit: async () => rows }),
        limit: async () => rows,
      });
    },
  };
  const db = {
    $raw: {
      prepare: (sql: string) => ({
        all: () => {
          if (sql.includes("save_clip_vec")) return input.knnClip ?? [];
          if (sql.includes("save_text_vec")) return input.knnText ?? [];
          return input.candidates ?? [];
        },
        get: () =>
          input.knnClip?.length || input.knnText?.length
            ? { dimensions: 2 }
            : undefined,
      }),
    },
    select: () => ({ from: () => selected }),
  } as unknown as Db;
  return {
    db,
    query: () => dialect.sqlToQuery(where.mock.calls[0]?.[0]),
  };
}

describe("LibraryRetrievalService", () => {
  it("builds safe prefix FTS expressions", () => {
    expect(toFtsMatchQuery("Suspiria lighting")).toBe(
      '"Suspiria"* AND "lighting"*',
    );
    expect(toFtsMatchQuery(` "'*** `)).toBeNull();
  });

  it("normalizes repeated media constraints", () => {
    expect(normalizeMedia(["image", "image", "video"])).toEqual([
      "image",
      "video",
    ]);
  });

  it("uses FTS candidates and applies the image filter", async () => {
    const portrait = {
      id: "portrait",
      title: "Studio portrait",
      url: "https://example.com/portrait",
      author: "Raphael",
      source: "arena",
      notes: null,
      description: "Editorial photography",
      mediaType: "image",
      savedAt: new Date(300),
    };
    const harness = fakeDb({
      candidates: [{ id: "portrait", rank: -2 }],
      rows: [portrait],
    });
    const result = await retrieveLibraryWithDb(
      harness.db,
      { query: "Kanye", media: ["image"], limit: 8 },
      {},
    );
    expect(result.saves.map((save) => save.id)).toEqual(["portrait"]);
    expect(result.hits[0]).toMatchObject({ channels: ["fts"] });
    expect(harness.query().params).toContain("image");
    expect(harness.query().sql).toContain("case when");
  });

  it("enforces an empty attachment scope", async () => {
    const harness = fakeDb({
      candidates: [{ id: "portrait", rank: -2 }],
      rows: [],
    });
    const result = await retrieveLibraryWithDb(
      harness.db,
      { query: "Kanye" },
      { saveIds: [] },
    );
    expect(result.saves).toEqual([]);
    expect(harness.query().sql).toContain("false");
  });

  it("lists recent scoped Saves without a lexical query", async () => {
    const video = {
      id: "video",
      title: "Kanye interview",
      url: "https://example.com/video",
      author: "Host",
      source: "youtube",
      notes: null,
      description: "A long interview",
      mediaType: "video",
      savedAt: new Date(200),
    };
    const harness = fakeDb({ rows: [video] });
    const result = await retrieveLibraryWithDb(
      harness.db,
      { media: ["video"] },
      {},
    );
    expect(result.saves.map((save) => save.id)).toEqual(["video"]);
    expect(result.hits[0]).toMatchObject({ channels: ["recent"] });
    expect(harness.query().params).toContain("video");
  });

  it("retrieves visual candidates with the matching CLIP text encoder", async () => {
    const visual = {
      id: "visual",
      title: "Untitled portrait",
      url: "https://example.com/visual",
      author: null,
      source: "arena",
      notes: null,
      description: null,
      mediaType: "image",
      savedAt: new Date(400),
      embedding: null,
      embeddingModel: null,
      clipEmbedding: [1, 0],
      clipModel: "Xenova/clip-vit-base-patch32@1",
      vector: [1, 0],
    };
    const harness = fakeDb({
      candidates: [],
      knnClip: [{ id: "visual", distance: 0 }],
      rows: [visual],
    });
    const result = await retrieveLibraryWithDb(
      harness.db,
      { query: "Kanye", media: ["image"] },
      {},
      {
        visual: {
          model: "Xenova/clip-vit-base-patch32@1",
          vector: [1, 0],
        },
      },
    );
    expect(result.saves.map((save) => save.id)).toEqual(["visual"]);
    expect(result.hits[0]).toMatchObject({ channels: ["visual"] });
  });

  it("ranks a visual probe without a lexical query", async () => {
    const visual = {
      id: "visual",
      title: "Untitled portrait",
      url: "https://example.com/visual",
      author: null,
      source: "arena",
      notes: null,
      description: null,
      mediaType: "image",
      savedAt: new Date(400),
    };
    const harness = fakeDb({
      knnClip: [{ id: "visual", distance: 0 }],
      rows: [visual],
    });
    const result = await retrieveLibraryWithDb(
      harness.db,
      {},
      {},
      {
        visual: {
          model: "Xenova/clip-vit-base-patch32@1",
          vector: [1, 0],
        },
      },
    );
    expect(result.saves.map((save) => save.id)).toEqual(["visual"]);
    expect(result.hits[0]).toMatchObject({ channels: ["visual"] });
  });

  it("never compares vectors from different model versions", async () => {
    const _stale = {
      id: "stale",
      title: "Stale vector",
      url: "https://example.com/stale",
      author: null,
      source: "arena",
      notes: null,
      description: null,
      mediaType: "image",
      savedAt: new Date(400),
      embedding: [1, 0],
      embeddingModel: "old-model@1",
      clipEmbedding: null,
      clipModel: null,
    };
    const harness = fakeDb({
      candidates: [],
      knnText: [{ id: "stale", distance: 0 }],
      rows: [],
    });
    const result = await retrieveLibraryWithDb(
      harness.db,
      { query: "Kanye" },
      {},
      { text: { model: "new-model@2", vector: [1, 0] } },
    );
    expect(result.saves).toEqual([]);
  });
});
