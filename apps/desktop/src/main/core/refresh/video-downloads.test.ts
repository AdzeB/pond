import * as schema from "@pond/schema/db";
import * as eventsSchema from "@pond/schema/events";
import { storedAsRawJson } from "@pond/schema/raw-schema";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { initializePondSchema } from "../../db";
import { findSavesMissingVideo, queueVideoDownloads } from "./video-downloads";

function nativeSqliteAvailable(): boolean {
  try {
    const probe = new Database(":memory:");
    probe.close();
    return true;
  } catch (error) {
    if (process.versions.electron) throw error;
    return false;
  }
}

const databases: Database.Database[] = [];

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

function setup() {
  const sqlite = new Database(":memory:");
  databases.push(sqlite);
  initializePondSchema(sqlite, () => false);
  const db = Object.assign(
    drizzle(sqlite, { schema: { ...schema, ...eventsSchema } }),
    { $raw: sqlite },
  );
  const kicks: number[] = [];
  const runtime = {
    getDb: async () => db,
    kickReconciler: () => {
      kicks.push(Date.now());
    },
    async persistSave(id: string, patch: Partial<schema.NewSave>) {
      db.update(schema.saves).set(patch).where(eq(schema.saves.id, id)).run();
      return null;
    },
  };
  return { db, runtime, kicks };
}

function videoSave(
  id: string,
  source: schema.Source,
  files: schema.SaveFile[] = [],
): schema.NewSave {
  return {
    id,
    source,
    sourceId: id,
    url: `https://example.com/${id}`,
    mediaType: "video",
    status: "complete",
    files,
    rawJson: storedAsRawJson({
      capture: { media: [{ type: "video", url: `https://example.com/${id}` }] },
    }),
  };
}

describe.skipIf(!nativeSqliteAvailable())("findSavesMissingVideo", () => {
  it("returns only saves from the source that lack a video file", async () => {
    const { db, runtime } = setup();
    db.insert(schema.saves)
      .values([
        videoSave("a", "youtube"),
        videoSave("b", "youtube", [
          { kind: "video", path: "video.mp4", sha256: "x", size: 1 },
        ]),
        videoSave("c", "twitter"),
      ])
      .run();
    expect(await findSavesMissingVideo("youtube", runtime)).toEqual(["a"]);
    expect((await findSavesMissingVideo(undefined, runtime)).sort()).toEqual([
      "a",
      "c",
    ]);
  });
});

describe.skipIf(!nativeSqliteAvailable())("queueVideoDownloads", () => {
  function videoTask(db: ReturnType<typeof setup>["db"], saveId: string) {
    return db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.saveId, saveId),
          eq(schema.tasks.op, "fetch_video_ytdlp"),
        ),
      )
      .get();
  }

  it("queues a requested fetch_video_ytdlp task and reopens the save", async () => {
    const { db, runtime, kicks } = setup();
    db.insert(schema.saves).values(videoSave("a", "youtube")).run();
    expect(await queueVideoDownloads(["a"], runtime)).toBe(1);
    const task = videoTask(db, "a");
    expect(task?.status).toBe("pending");
    expect(task?.payload).toEqual({ requested: true, priority: "interactive" });
    const finalize = db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.saveId, "a"), eq(schema.tasks.op, "finalize")))
      .get();
    expect(finalize?.status).toBe("pending");
    const save = db
      .select()
      .from(schema.saves)
      .where(eq(schema.saves.id, "a"))
      .get();
    expect(save?.status).toBe("ingesting");
    expect(kicks).toHaveLength(1);
  });

  it("resets an existing done task to pending with zero attempts", async () => {
    const { db, runtime } = setup();
    db.insert(schema.saves).values(videoSave("a", "youtube")).run();
    const now = new Date();
    db.insert(schema.tasks)
      .values({
        id: "t1",
        saveId: "a",
        source: "youtube",
        op: "fetch_video_ytdlp",
        status: "done",
        attempts: 3,
        maxAttempts: 5,
        lastError: "skipped",
        nextRunAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    expect(await queueVideoDownloads(["a"], runtime)).toBe(1);
    const task = videoTask(db, "a");
    expect(task?.id).toBe("t1");
    expect(task?.status).toBe("pending");
    expect(task?.attempts).toBe(0);
    expect(task?.lastError).toBeNull();
    expect(task?.payload).toEqual({ requested: true, priority: "interactive" });
  });

  it("skips failed saves whose earlier tasks would block the download", async () => {
    const { db, runtime, kicks } = setup();
    db.insert(schema.saves)
      .values({ ...videoSave("a", "youtube"), status: "failed" })
      .run();
    const now = new Date();
    db.insert(schema.tasks)
      .values({
        id: "t1",
        saveId: "a",
        source: "youtube",
        op: "fetch_blobs",
        status: "dead",
        nextRunAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    expect(await queueVideoDownloads(["a"], runtime)).toBe(0);
    expect(videoTask(db, "a")).toBeUndefined();
    expect(kicks).toHaveLength(0);
  });
});
