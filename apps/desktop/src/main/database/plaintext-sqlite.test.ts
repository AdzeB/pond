import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openSqlite } from "./client";
import {
  convertLegacyDatabase,
  convertLegacyDatabaseWithKeyCandidates,
  needsDatabaseConversion,
} from "./plaintext-sqlite";

const key = Buffer.alloc(32, 7);
const roots: string[] = [];
const connections: Database.Database[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) {
    if (connection.open) connection.close();
  }
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function nativeAvailable() {
  try {
    new Database(":memory:").close();
    return true;
  } catch (error) {
    if (process.versions.electron) throw error;
    return false;
  }
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pond-plaintext-db-"));
  roots.push(root);
  return { root, file: join(root, "library.db") };
}

function legacyDatabase(file: string) {
  const database = new Database(file);
  connections.push(database);
  database.pragma("cipher='sqlcipher'");
  database.pragma("legacy=4");
  database.pragma(`key="x'${key.toString("hex")}'"`);
  return database;
}

function readNotes(database: Database.Database) {
  return database.prepare("SELECT id, body FROM notes ORDER BY id").all();
}

const notes = [
  { id: 1, body: "First saved note" },
  { id: 2, body: "A second note with café and 日本語" },
];

function seed(database: Database.Database) {
  database.exec(
    "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)",
  );
  const insert = database.prepare("INSERT INTO notes (id, body) VALUES (?, ?)");
  for (const note of notes) insert.run(note.id, note.body);
}

describe.skipIf(!nativeAvailable())(
  "plaintext Library database migration",
  () => {
    it("creates a new readable plaintext database through the normal client", () => {
      const { file } = fixture();
      expect(needsDatabaseConversion(file)).toBe(false);
      const database = openSqlite(file);
      connections.push(database);
      seed(database);
      database.close();

      expect(needsDatabaseConversion(file)).toBe(false);
      const reopened = new Database(file, { fileMustExist: true });
      connections.push(reopened);
      expect(readNotes(reopened)).toEqual(notes);
    });

    it("converts encrypted records and retains an encrypted recovery backup", () => {
      const { file } = fixture();
      const source = legacyDatabase(file);
      seed(source);
      source.close();
      const encrypted = readFileSync(file);
      expect(needsDatabaseConversion(file)).toBe(true);

      const backup = convertLegacyDatabase(file, key);

      expect(backup).not.toBeNull();
      expect(needsDatabaseConversion(file)).toBe(false);
      const reopened = openSqlite(file);
      connections.push(reopened);
      expect(readNotes(reopened)).toEqual(notes);
      if (!backup) throw new Error("The conversion did not retain its backup.");
      expect(readFileSync(backup)).toEqual(encrypted);
      expect(needsDatabaseConversion(backup)).toBe(true);
      const encryptedBackup = legacyDatabase(backup);
      expect(readNotes(encryptedBackup)).toEqual(notes);
    });

    it("preserves committed records that only exist in the encrypted WAL", () => {
      const { root, file } = fixture();
      const writerFile = join(root, "writer.db");
      const writer = legacyDatabase(writerFile);
      writer.pragma("journal_mode = WAL");
      writer.pragma("wal_autocheckpoint = 0");
      seed(writer);
      expect(statSync(`${writerFile}-wal`).size).toBeGreaterThan(0);
      copyFileSync(writerFile, file);
      copyFileSync(`${writerFile}-wal`, `${file}-wal`);
      writer.close();

      const backup = convertLegacyDatabase(file, key);

      const reopened = new Database(file, { fileMustExist: true });
      connections.push(reopened);
      expect(readNotes(reopened)).toEqual(notes);
      if (!backup) throw new Error("The conversion did not retain its backup.");
      expect(readNotes(legacyDatabase(backup))).toEqual(notes);
    });

    it("preserves committed WAL records when another reader prevents conversion", () => {
      const { root, file } = fixture();
      const writer = legacyDatabase(file);
      writer.pragma("journal_mode = WAL");
      writer.pragma("wal_autocheckpoint = 0");
      seed(writer);
      writer.pragma("wal_checkpoint(TRUNCATE)");
      const reader = legacyDatabase(file);
      reader.exec("BEGIN");
      expect(readNotes(reader)).toEqual(notes);
      const added = {
        id: 3,
        body: "Committed while the reader holds its snapshot",
      };
      writer
        .prepare("INSERT INTO notes (id, body) VALUES (?, ?)")
        .run(added.id, added.body);
      const original = readFileSync(file);
      const wal = readFileSync(`${file}-wal`);
      const files = readdirSync(root).sort();

      expect(() => convertLegacyDatabase(file, key)).toThrow(
        "database is in use",
      );

      expect(readFileSync(file)).toEqual(original);
      expect(readFileSync(`${file}-wal`)).toEqual(wal);
      expect(readdirSync(root).sort()).toEqual(files);
      expect(readNotes(writer)).toEqual([...notes, added]);
      reader.exec("ROLLBACK");
      reader.close();
      writer.close();
      convertLegacyDatabase(file, key);
      const reopened = openSqlite(file);
      connections.push(reopened);
      expect(readNotes(reopened)).toEqual([...notes, added]);
    }, 10_000);

    it("leaves the original bytes untouched when the key is wrong", () => {
      const { root, file } = fixture();
      const source = legacyDatabase(file);
      seed(source);
      source.close();
      const original = readFileSync(file);
      const originalFiles = readdirSync(root).sort();

      expect(() => convertLegacyDatabase(file, Buffer.alloc(32, 8))).toThrow();

      expect(readFileSync(file)).toEqual(original);
      expect(readdirSync(root).sort()).toEqual(originalFiles);
      expect(readNotes(legacyDatabase(file))).toEqual(notes);
    });

    it("tries the next key candidate for a mixed legacy Library", async () => {
      const { file } = fixture();
      const source = legacyDatabase(file);
      seed(source);
      source.close();
      const encrypted = readFileSync(file);

      const backup = await convertLegacyDatabaseWithKeyCandidates(file, [
        async () => Buffer.alloc(32, 8),
        async () => Buffer.from(key),
      ]);

      expect(backup).not.toBeNull();
      const reopened = openSqlite(file);
      connections.push(reopened);
      expect(readNotes(reopened)).toEqual(notes);
      if (!backup) throw new Error("The conversion did not retain its backup.");
      expect(readFileSync(backup)).toEqual(encrypted);
    });

    it("does not use a key or create another backup for plaintext databases", () => {
      const { root, file } = fixture();
      const source = legacyDatabase(file);
      seed(source);
      source.close();
      convertLegacyDatabase(file, key);
      const plaintext = readFileSync(file);
      const files = readdirSync(root).sort();

      expect(convertLegacyDatabase(file, new Uint8Array())).toBeNull();

      expect(readFileSync(file)).toEqual(plaintext);
      expect(readdirSync(root).sort()).toEqual(files);
      const missing = join(root, "missing.db");
      expect(convertLegacyDatabase(missing, new Uint8Array())).toBeNull();
      expect(existsSync(missing)).toBe(false);
    });
  },
);
