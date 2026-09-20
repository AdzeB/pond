import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { loadSqliteVec } from "../core/vec-index";
import {
  configureSqlCipher,
  migratePlaintextSqlite,
  openEncryptedSqlite,
  rekeySqlCipher,
  sqlCipherAvailable,
} from "./encrypted-sqlite";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

describe("encrypted SQLite", () => {
  it("encrypts the database header and rejects the wrong key", () => {
    expect(sqlCipherAvailable()).toBe(true);
    const root = mkdtempSync(join(tmpdir(), "pond-sqlcipher-"));
    roots.push(root);
    const file = join(root, "index.db");
    const key = randomBytes(32);
    const wrongKey = randomBytes(32);

    const created = new Database(file);
    configureSqlCipher(created, key);
    created.exec(
      "CREATE TABLE example(value TEXT); INSERT INTO example VALUES ('secret')",
    );
    created.close();

    expect(readFileSync(file).subarray(0, 16).toString("utf8")).not.toBe(
      "SQLite format 3\u0000",
    );

    const rejected = new Database(file);
    expect(() => configureSqlCipher(rejected, wrongKey)).toThrow();
    rejected.close();

    const reopened = new Database(file);
    configureSqlCipher(reopened, key);
    expect(reopened.prepare("SELECT value FROM example").get()).toEqual({
      value: "secret",
    });
    reopened.close();
  });

  it("rotates the key without exposing plaintext", () => {
    const root = mkdtempSync(join(tmpdir(), "pond-sqlcipher-"));
    roots.push(root);
    const file = join(root, "index.db");
    const firstKey = randomBytes(32);
    const nextKey = randomBytes(32);

    const created = new Database(file);
    configureSqlCipher(created, firstKey);
    created.exec(
      "CREATE TABLE example(value TEXT); INSERT INTO example VALUES ('secret')",
    );
    rekeySqlCipher(created, nextKey);
    created.close();

    const reopened = new Database(file);
    configureSqlCipher(reopened, nextKey);
    expect(reopened.prepare("SELECT value FROM example").get()).toEqual({
      value: "secret",
    });
    reopened.close();
  });

  it("migrates a plaintext database after preserving a verified backup", () => {
    const root = mkdtempSync(join(tmpdir(), "pond-sqlcipher-"));
    roots.push(root);
    const file = join(root, "index.db");
    const key = randomBytes(32);

    const plaintext = new Database(file);
    plaintext.exec(
      "CREATE TABLE example(value TEXT); INSERT INTO example VALUES ('secret')",
    );
    plaintext.close();

    const backup = migratePlaintextSqlite(file, key);
    expect(readFileSync(backup).subarray(0, 16).toString("utf8")).toBe(
      "SQLite format 3\u0000",
    );
    expect(readFileSync(file).subarray(0, 16).toString("utf8")).not.toBe(
      "SQLite format 3\u0000",
    );

    const reopened = openEncryptedSqlite(file, key);
    expect(reopened.prepare("SELECT value FROM example").get()).toEqual({
      value: "secret",
    });
    reopened.close();
  });

  it("loads sqlite-vec on an encrypted connection", () => {
    const root = mkdtempSync(join(tmpdir(), "pond-sqlcipher-"));
    roots.push(root);
    const file = join(root, "index.db");
    const sqlite = openEncryptedSqlite(file, randomBytes(32));

    expect(loadSqliteVec(sqlite)).toBe(true);

    sqlite.close();
  });
});
