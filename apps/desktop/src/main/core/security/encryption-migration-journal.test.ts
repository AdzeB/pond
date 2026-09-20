import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  EncryptionMigrationJournalStore,
  type PlannedEncryptionMigrationEntry,
} from "./encryption-migration-journal";

const roots: string[] = [];
const sourceChecksum = "a".repeat(64);
const destinationChecksum = "b".repeat(64);

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(
  entries: readonly PlannedEncryptionMigrationEntry[] = [
    {
      id: "item",
      kind: "item-file",
      source: "items/item/original.jpg",
      destination: "encrypted/items/item/original.jpg",
      sourceChecksum,
    },
    {
      id: "index",
      kind: "index",
      source: "index/library.db",
      destination: "encrypted/index/library.db",
      sourceChecksum,
    },
  ],
) {
  const root = await mkdtemp(join(tmpdir(), "pond-encryption-journal-"));
  roots.push(root);
  const store = new EncryptionMigrationJournalStore({ root });
  await store.create({ migrationId: "migration-1", entries });
  return { root, store };
}

it("inspects interrupted entry work and resumes through verification and commit", async () => {
  const { root, store } = await fixture();
  await store.startEntry("item");

  const resumed = new EncryptionMigrationJournalStore({ root });
  const interrupted = await resumed.inspect();
  expect(interrupted).toMatchObject({
    action: "resume",
    pendingEntryIds: ["index"],
    inProgressEntryIds: ["item"],
  });

  await resumed.verifyEntry({
    entryId: "item",
    destinationChecksum,
  });
  await resumed.startEntry("index");
  await resumed.verifyEntry({
    entryId: "index",
    destinationChecksum,
  });
  expect((await resumed.inspect()).action).toBe("commit");

  const committed = await resumed.commit();
  expect(committed.state).toBe("committed");
  expect(committed.entries.every((entry) => entry.phase === "committed")).toBe(
    true,
  );
});

it("rejects a journal whose persisted payload was tampered with", async () => {
  const { store } = await fixture();
  const serialized = await readFile(store.journalPath, "utf8");
  await writeFile(
    store.journalPath,
    serialized.replace('"migration-1"', '"migration-2"'),
  );

  await expect(store.inspect()).rejects.toThrow(
    "journal integrity check failed",
  );
});

it("refuses to commit while any migration entry remains incomplete", async () => {
  const { store } = await fixture();
  await store.startEntry("item");
  await store.verifyEntry({
    entryId: "item",
    destinationChecksum,
  });

  await expect(store.commit()).rejects.toThrow(
    "cannot commit until every entry verifies",
  );
  expect((await store.inspect()).journal.state).toBe("in-progress");
});

it("rejects source, destination, and journal paths outside the library", async () => {
  const root = await mkdtemp(join(tmpdir(), "pond-encryption-containment-"));
  roots.push(root);
  const traversalStore = new EncryptionMigrationJournalStore({ root });
  await expect(
    traversalStore.create({
      migrationId: "traversal",
      entries: [
        {
          id: "settings",
          kind: "settings",
          source: "../settings.json",
          destination: "encrypted/settings.json",
          sourceChecksum,
        },
      ],
    }),
  ).rejects.toThrow("inside the library");

  expect(
    () =>
      new EncryptionMigrationJournalStore({
        root,
        journalPath: "/tmp/encryption-migration.json",
      }),
  ).toThrow("Journal path must be a relative path inside the library");

  const absoluteStore = new EncryptionMigrationJournalStore({ root });
  await expect(
    absoluteStore.create({
      migrationId: "absolute",
      entries: [
        {
          id: "backup",
          kind: "backup",
          source: "backups/library.zip",
          destination: "/tmp/library.zip",
          sourceChecksum,
        },
      ],
    }),
  ).rejects.toThrow(
    "Migration destination must be a relative path inside the library",
  );
});

it("persists rollback progress and completes only after touched entries restore", async () => {
  const { root, store } = await fixture();
  await store.startEntry("item");
  await store.verifyEntry({
    entryId: "item",
    destinationChecksum,
  });
  await store.beginRollback("Verification failed for the index.");

  const resumed = new EncryptionMigrationJournalStore({ root });
  const interrupted = await resumed.inspect();
  expect(interrupted.action).toBe("rollback");
  expect(interrupted.rolledBackEntryIds).toEqual(["index"]);
  await expect(resumed.completeRollback()).rejects.toThrow(
    "until every entry is restored",
  );

  await resumed.recordEntryRolledBack({
    entryId: "item",
    restoredSourceChecksum: sourceChecksum,
  });
  const rolledBack = await resumed.completeRollback();
  expect(rolledBack).toMatchObject({
    state: "rolled-back",
    rollback: {
      reason: "Verification failed for the index.",
    },
  });
  expect(rolledBack.rollback?.completedAt).not.toBeNull();
  expect(
    rolledBack.entries.every(
      (entry) =>
        entry.phase === "rolled-back" && entry.rollback?.completedAt !== null,
    ),
  ).toBe(true);
});
