import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { initializePondSchema } from "./db";

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

describe.skipIf(!nativeSqliteAvailable())(
  "Pond database initialization",
  () => {
    it("initializes a fresh library before installing the vector delete trigger", () => {
      const db = new Database(":memory:");
      try {
        expect(initializePondSchema(db)).toBe(true);
        expect(
          db
            .prepare(
              "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'saves_vec_ad'",
            )
            .get(),
        ).toEqual({ name: "saves_vec_ad" });
        db.prepare(
          "INSERT INTO saves (id, source, source_id, url) VALUES (?, ?, ?, ?)",
        ).run("first", "web", "first", "https://example.com");
        expect(() =>
          db.prepare("DELETE FROM saves WHERE id = ?").run("first"),
        ).not.toThrow();
      } finally {
        db.close();
      }
    });

    it("preserves saved rows when initialized again", () => {
      const db = new Database(":memory:");
      try {
        initializePondSchema(db);
        db.prepare(
          "INSERT INTO saves (id, source, source_id, url) VALUES (?, ?, ?, ?)",
        ).run("kept", "web", "kept", "https://example.com");
        expect(initializePondSchema(db)).toBe(true);
        expect(db.prepare("SELECT id FROM saves").all()).toEqual([
          { id: "kept" },
        ]);
      } finally {
        db.close();
      }
    });

    it("preserves legacy saved views as root saved views across migration and reopening", () => {
      const db = new Database(":memory:");
      try {
        db.exec(`CREATE TABLE saved_views (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          query TEXT NOT NULL,
          sort_key TEXT NOT NULL,
          sort_dir TEXT NOT NULL,
          layout TEXT,
          sort_order INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )`);
        const query = JSON.stringify({ kind: "and", clauses: [] });
        db.prepare(
          "INSERT INTO saved_views VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run("legacy", "Reference", query, "title", "asc", "grid", 4, 1234);
        const expected = {
          id: "legacy",
          name: "Reference",
          query,
          sort_key: "title",
          sort_dir: "asc",
          layout: "grid",
          sort_order: 4,
          created_at: 1234,
          question: null,
          kind: "saved_view",
          parent_id: null,
        };
        initializePondSchema(db, () => false);
        expect(db.prepare("SELECT * FROM saved_views").get()).toEqual(expected);
        initializePondSchema(db, () => false);
        expect(db.prepare("SELECT * FROM saved_views").get()).toEqual(expected);
        db.prepare(
          "INSERT INTO saved_views (id, name, query, sort_key, sort_dir, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).run("new", "New", query, "savedAt", "desc", 5, 1235);
        expect(
          db
            .prepare("SELECT kind, parent_id FROM saved_views WHERE id = ?")
            .get("new"),
        ).toEqual({ kind: "saved_view", parent_id: null });
      } finally {
        db.close();
      }
    });

    it("opens a usable library without vector tables when the extension is unavailable", () => {
      const db = new Database(":memory:");
      try {
        expect(initializePondSchema(db, () => false)).toBe(false);
        expect(
          db
            .prepare(
              "SELECT name FROM sqlite_master WHERE name IN ('vec_meta', 'saves_vec_ad')",
            )
            .all(),
        ).toEqual([]);
        db.prepare(
          "INSERT INTO saves (id, source, source_id, url) VALUES (?, ?, ?, ?)",
        ).run("lexical", "web", "lexical", "https://example.com");
        expect(db.prepare("SELECT id FROM saves").all()).toEqual([
          { id: "lexical" },
        ]);
      } finally {
        db.close();
      }
    });
  },
);
