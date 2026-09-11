import * as schema from "@pond/schema/db";
import * as events from "@pond/schema/events";
import { EMPTY_QUERY } from "@pond/schema/filters";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { initializePondSchema } from "../db";
import { queryLibraryIds, queryLibraryPage } from "./library-query";
import { querySidebarCounts } from "./sidebar-counts";

function nativeAvailable() {
  try {
    const db = new Database(":memory:");
    db.close();
    return true;
  } catch (error) {
    if (process.versions.electron) throw error;
    return false;
  }
}
const opened: Database.Database[] = [];
afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});
function setup() {
  const sqlite = new Database(":memory:");
  opened.push(sqlite);
  initializePondSchema(sqlite, () => false);
  const db = Object.assign(
    drizzle(sqlite, { schema: { ...schema, ...events } }),
    { $raw: sqlite },
  );
  const insert = sqlite.prepare(
    "insert into saves (id, source, source_id, url, title, saved_at, created_at, status, media_type) values (?, 'local', ?, 'pond:test', ?, ?, ?, 'complete', 'text')",
  );
  sqlite.transaction(() => {
    for (let i = 0; i < 1200; i++)
      insert.run(
        String(i).padStart(4, "0"),
        String(i),
        `reference blue sky ${i}`,
        i,
        i,
      );
  })();
  return { db, sqlite };
}

describe.skipIf(!nativeAvailable())("authoritative library query", () => {
  it("counts the full library and folder membership beyond the renderer page", () => {
    const { db, sqlite } = setup();
    sqlite.exec(
      "insert into folders(id,name) values ('all','All');insert into save_folders(save_id,folder_id) select id,'all' from saves;update saves set deleted_at=1 where id='0000'",
    );
    expect(querySidebarCounts(db)).toEqual({
      library: 1199,
      uncategorized: 0,
      untagged: 1199,
      trash: 1,
      folders: { all: 1199 },
    });
  });
  it("applies folder and keyword scope before limiting global hits", async () => {
    const { db, sqlite } = setup();
    sqlite.exec(
      "insert into folders(id,name) values ('older','Older'); insert into save_folders(save_id,folder_id) values ('0001','older')",
    );
    const result = await queryLibraryPage(db, "library", {
      query: EMPTY_QUERY,
      keywords: '"blue sky" -red',
      scope: { folderIds: ["older"] },
      limit: 10,
    });
    expect(result.ids).toEqual(["0001"]);
    expect(result.total).toBe(1);
  });
  it("pages every matching ID with stable ties, nulls last and exact totals", async () => {
    const { db, sqlite } = setup();
    sqlite.exec("update saves set rating=3 where cast(id as integer)%2=0");
    const request = {
      query: EMPTY_QUERY,
      sortKey: "rating",
      sortDir: "asc" as const,
      limit: 127,
    };
    let page = await queryLibraryPage(db, "library", request);
    const ids = [...page.ids];
    while (page.nextCursor) {
      page = await queryLibraryPage(db, "library", {
        ...request,
        cursor: page.nextCursor,
      });
      ids.push(...page.ids);
    }
    expect(new Set(ids).size).toBe(1200);
    expect(ids).toHaveLength(1200);
    expect(page.total).toBe(1200);
    expect(ids.slice(0, 600).every((id) => Number(id) % 2 === 0)).toBe(true);
    expect((await queryLibraryIds(db, "library", request)).ids).toEqual(ids);
  });
  it("rejects a cursor after mutations or switching libraries", async () => {
    const { db, sqlite } = setup();
    const first = await queryLibraryPage(db, "one", {
      query: EMPTY_QUERY,
      limit: 10,
    });
    await expect(
      queryLibraryPage(db, "two", {
        query: EMPTY_QUERY,
        cursor: first.nextCursor,
      }),
    ).rejects.toThrow("library changed");
    sqlite.exec("update saves set title='changed' where id='0001'");
    await expect(
      queryLibraryPage(db, "one", {
        query: EMPTY_QUERY,
        cursor: first.nextCursor,
      }),
    ).rejects.toThrow("library changed");
  });
  it("keeps seeded random order stable across pages and unrelated imports", async () => {
    const { db, sqlite } = setup();
    const request = {
      query: EMPTY_QUERY,
      sortKey: "random",
      sortDir: "asc" as const,
      randomSeed: "landscapes",
      limit: 127,
    };
    const first = await queryLibraryPage(db, "library", request);
    let page = first;
    const ids = [...page.ids];
    while (page.nextCursor) {
      page = await queryLibraryPage(db, "library", {
        ...request,
        cursor: page.nextCursor,
      });
      ids.push(...page.ids);
    }
    expect(new Set(ids).size).toBe(1200);
    expect((await queryLibraryIds(db, "library", request)).ids).toEqual(ids);
    const shuffled = await queryLibraryIds(db, "library", {
      ...request,
      randomSeed: "another",
    });
    expect(shuffled.ids).not.toEqual(ids);
    await expect(
      queryLibraryPage(db, "library", {
        ...request,
        randomSeed: "another",
        cursor: first.nextCursor,
      }),
    ).rejects.toThrow("library changed");
    sqlite.exec(
      "insert into saves (id,source,source_id,url,title,status,media_type) values ('new','local','new','pond:new','New','complete','text')",
    );
    expect(
      (await queryLibraryIds(db, "library", request)).ids.filter(
        (id) => id !== "new",
      ),
    ).toEqual(ids);
  });

  it("pages manual ranks before unordered saves and rejects stale arrangements", async () => {
    const { db } = setup();
    const order = ["0003", "0199", "0001"];
    const request = {
      query: EMPTY_QUERY,
      sortKey: "manual",
      sortDir: "asc" as const,
      limit: 2,
    };
    let page = await queryLibraryPage(db, "library", request, order);
    expect(page.ids).toEqual(["0003", "0199"]);
    await expect(
      queryLibraryPage(
        db,
        "library",
        { ...request, cursor: page.nextCursor },
        [...order].reverse(),
      ),
    ).rejects.toThrow("library changed");
    const ids = [...page.ids];
    while (page.nextCursor) {
      page = await queryLibraryPage(
        db,
        "library",
        { ...request, limit: 127, cursor: page.nextCursor },
        order,
      );
      ids.push(...page.ids);
    }
    expect(ids.slice(0, 4)).toEqual(["0003", "0199", "0001", "1199"]);
    expect(new Set(ids).size).toBe(1200);
    expect((await queryLibraryIds(db, "library", request, order)).ids).toEqual(
      ids,
    );
  });

  it("floats pinned ids to the front of any sort", async () => {
    const { db } = setup();
    const request = {
      query: EMPTY_QUERY,
      sortKey: "savedAt",
      sortDir: "desc" as const,
      limit: 5,
    };
    const unpinned = await queryLibraryPage(db, "library", request, [], []);
    expect(unpinned.ids[0]).toBe("1199");
    const pinned = await queryLibraryPage(
      db,
      "library",
      request,
      [],
      ["0003", "0001"],
    );
    expect(pinned.ids.slice(0, 4)).toEqual(["0003", "0001", "1199", "1198"]);
  });

  it("indexes image comments and video notes and refreshes annotations on edit", async () => {
    const { db, sqlite } = setup();
    sqlite
      .prepare("update saves set comments=?,video_notes=? where id=?")
      .run(
        JSON.stringify([{ id: "c", text: "cyan region" }]),
        JSON.stringify([{ id: "v", timeSec: 5, text: "waterfall moment" }]),
        "0001",
      );
    expect(
      (
        await queryLibraryPage(db, "library", {
          query: EMPTY_QUERY,
          keywords: "waterfall",
        })
      ).ids,
    ).toEqual(["0001"]);
    expect(
      (
        await queryLibraryPage(db, "library", {
          query: EMPTY_QUERY,
          keywords: '"cyan region"',
        })
      ).ids,
    ).toEqual(["0001"]);
    sqlite.exec("update saves set video_notes='[]' where id='0001'");
    expect(
      (
        await queryLibraryPage(db, "library", {
          query: EMPTY_QUERY,
          keywords: "waterfall",
        })
      ).total,
    ).toBe(0);
  });

  it("refreshes keyword results after imports and searchable metadata edits", async () => {
    const { db, sqlite } = setup();
    const idsFor = async (keywords: string) =>
      (
        await queryLibraryPage(db, "library", {
          query: EMPTY_QUERY,
          keywords,
        })
      ).ids;

    expect(await idsFor("newlyimported")).toEqual([]);
    sqlite
      .prepare(
        "insert into saves (id, source, source_id, url, title, saved_at, created_at, status, media_type) values ('imported', 'local', 'imported', 'pond:imported', 'newlyimported', 0, 0, 'complete', 'text')",
      )
      .run();
    expect(await idsFor("newlyimported")).toEqual(["imported"]);

    sqlite
      .prepare(
        "update saves set title=?, tags=?, notes=?, ocr_text=?, transcript=?, comments=?, video_notes=? where id='imported'",
      )
      .run(
        "renamedmarker",
        JSON.stringify(["tagmarker"]),
        "notesmarker",
        "ocrmarker",
        "transcriptmarker",
        JSON.stringify([{ id: "comment", text: "commentmarker" }]),
        JSON.stringify([{ id: "video-note", timeSec: 4, text: "videomarker" }]),
      );
    for (const keyword of [
      "renamedmarker",
      "tagmarker",
      "notesmarker",
      "ocrmarker",
      "transcriptmarker",
      "commentmarker",
      "videomarker",
    ])
      expect(await idsFor(keyword)).toEqual(["imported"]);

    sqlite
      .prepare(
        "update saves set title='ordinary', tags='[]', notes=null, ocr_text=null, transcript=null, comments='[]', video_notes='[]' where id='imported'",
      )
      .run();
    for (const keyword of [
      "renamedmarker",
      "tagmarker",
      "notesmarker",
      "ocrmarker",
      "transcriptmarker",
      "commentmarker",
      "videomarker",
    ])
      expect(await idsFor(keyword)).toEqual([]);
  });

  it("uses calendar midnight for Today rather than a rolling day", async () => {
    const { db, sqlite } = setup();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sqlite
      .prepare("update saves set saved_at=? where id='0001'")
      .run(today.getTime() - 1);
    sqlite
      .prepare("update saves set saved_at=? where id='0002'")
      .run(today.getTime());
    const page = await queryLibraryPage(db, "library", {
      query: {
        combinator: "and",
        rules: [{ field: "savedAt", operator: "gte", value: "today" }],
      },
    });
    expect(page.ids).toEqual(["0002"]);
  });
});
