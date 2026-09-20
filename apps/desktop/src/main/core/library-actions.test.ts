import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inverse, type Transaction } from "@pond/schema/tx";
import { afterEach, describe, expect, it } from "vitest";
import type { ActionDefinition } from "../../shared/action-contracts";
import {
  type ActionRuntime,
  deleteAction,
  duplicateAction,
  prepareAction,
  previewAction,
  readActions,
  runAction,
  saveAction,
} from "./library-actions";

import { planTagRegistryUpdates } from "./tags";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
const rename: ActionDefinition = {
  id: "rename",
  name: "Sequence",
  steps: [{ kind: "rename", pattern: "{n} {title}", start: 7, padding: 3 }],
};
const rows = [
  {
    id: "z",
    folderIds: ["folder-old"],
    title: "First {n}",
    tags: ["old"],
    rating: 1,
    notes: "Original",
  },
  {
    id: "a",
    folderIds: [],
    title: "Second",
    tags: [],
    rating: null,
    notes: null,
  },
];

describe("library actions", () => {
  it("keeps selection order and treats placeholders in existing titles literally", () => {
    const preview = previewAction(rename, rows);
    expect(preview.changes.map((change) => change.after.title)).toEqual([
      "007 First {n}",
      "008 Second",
    ]);
    expect(preview.changes.map((change) => change.id)).toEqual(["z", "a"]);
  });
  it("applies steps sequentially while preserving before values for undo", () => {
    const definition: ActionDefinition = {
      id: "organize",
      name: "Organize",
      steps: [
        { kind: "add-tags", tags: ["old", "new"] },
        { kind: "remove-tags", tags: ["old"] },
        { kind: "rating", rating: 0 },
        { kind: "notes", mode: "append", text: "Reviewed" },
      ],
    };
    const preview = previewAction(definition, rows);
    expect(preview.changes[0]).toEqual({
      id: "z",
      before: {
        folderIds: ["folder-old"],
        title: "First {n}",
        tags: ["old"],
        rating: 1,
        notes: "Original",
      },
      after: {
        folderIds: ["folder-old"],
        title: "First {n}",
        tags: ["new"],
        rating: null,
        notes: "Original\nReviewed",
      },
    });
    expect(rows[0]?.tags).toEqual(["old"]);
  });
  it("invalidates the preview if order, metadata, or action changes", () => {
    const original = previewAction(rename, rows).token;
    expect(previewAction(rename, rows).token).toBe(original);
    expect(previewAction(rename, [...rows].reverse()).token).not.toBe(original);
    expect(
      previewAction(
        rename,
        rows.map((row) => ({ ...row, notes: "Changed" })),
      ).token,
    ).not.toBe(original);
    expect(previewAction({ ...rename, name: "Changed" }, rows).token).not.toBe(
      original,
    );
  });
  it("persists definitions in the library and refuses to overwrite corrupt data", () => {
    const root = mkdtempSync(join(tmpdir(), "pond-actions-"));
    roots.push(root);
    expect(readActions(root)).toEqual([]);
    saveAction(rename, root);
    expect(readActions(root)).toEqual([rename]);
    saveAction({ ...rename, name: "Updated" }, root);
    expect(readActions(root)).toHaveLength(1);
    expect(readActions(root)[0]?.name).toBe("Updated");
    deleteAction(rename.id, root);
    expect(readActions(root)).toEqual([]);
    writeFileSync(join(root, "actions.json"), "broken");
    expect(() => saveAction(rename, root)).toThrow("could not be read");
  });
  it("duplicates actions without copying shortcuts and rejects shortcut conflicts", () => {
    const root = mkdtempSync(join(tmpdir(), "pond-actions-"));
    roots.push(root);
    const first = saveAction({ ...rename, shortcut: "Mod+Shift+1" }, root);
    const duplicate = duplicateAction(first.id, root);
    expect(duplicate).toMatchObject({
      name: "Sequence Copy",
      shortcut: null,
      steps: first.steps,
    });
    expect(duplicate.id).not.toBe(first.id);
    expect(() =>
      saveAction(
        {
          ...rename,
          id: "conflict",
          name: "Conflict",
          shortcut: "mod+shift+1",
        },
        root,
      ),
    ).toThrow("already assigned");
    expect(() =>
      saveAction(
        {
          ...rename,
          id: "custom-conflict",
          name: "Custom Conflict",
          shortcut: "Control+Alt+K",
        },
        root,
        {
          profile: "pond",
          overrides: { "save.add-tag": "Control+Alt+K" },
        },
      ),
    ).toThrow("already assigned to Add Tag");
  });
  it("expands date, tags, original title, and inline sequence padding", () => {
    const preview = previewAction(
      {
        ...rename,
        steps: [
          {
            kind: "rename",
            pattern: "{n:4} {tags} {original}",
            start: 2,
            padding: 1,
          },
        ],
      },
      rows,
    );
    expect(preview.changes.map((change) => change.after.title)).toEqual([
      "0002 old First {n}",
      "0003  Second",
    ]);
  });
});

it("executes exactly the previewed change, rejects stale previews, and records undo only after success", async () => {
  const current = structuredClone(rows);
  const undoBatches: Transaction[][] = [];
  let failed = false;
  const runtime: ActionRuntime = {
    async prepareTags() {
      return [];
    },
    async read(ids) {
      return ids.flatMap((id) => current.filter((row) => row.id === id));
    },
    async commit(transactions) {
      if (failed) throw new Error("Disk unavailable");
      for (const tx of transactions) {
        if (tx.kind !== "update" || tx.model !== "save")
          throw new Error("Unexpected transaction");
        const row = current.find((row) => row.id === tx.id);
        if (row) Object.assign(row, tx.patch);
      }
    },
    recordUndo(transactions) {
      undoBatches.push(transactions);
    },
  };
  const ids = ["z", "a"];
  const initial = await prepareAction(rename, ids, runtime);
  const first = current[0];
  if (!first) throw new Error("Missing fixture");
  first.title = "Edited after preview";
  await expect(runAction(rename, ids, initial.token, runtime)).rejects.toThrow(
    "selection changed",
  );
  expect(undoBatches).toEqual([]);
  const fresh = await prepareAction(rename, ids, runtime);
  failed = true;
  await expect(runAction(rename, ids, fresh.token, runtime)).rejects.toThrow(
    "Disk unavailable",
  );
  expect(undoBatches).toEqual([]);
  failed = false;
  expect(await runAction(rename, ids, fresh.token, runtime)).toBe(2);
  expect(current[0]?.title).toBe("007 Edited after preview");
  expect(undoBatches).toHaveLength(1);
  expect(undoBatches[0]?.[0]).toMatchObject({
    before: { title: "Edited after preview" },
    patch: { title: "007 Edited after preview" },
  });
});

it("records folder and metadata changes in the same batch with exact membership undo", async () => {
  const current = structuredClone(rows);
  const batches: Transaction[][] = [];
  const runtime: ActionRuntime = {
    async prepareTags() {
      return [];
    },
    async read(ids) {
      return ids.flatMap((id) => current.filter((row) => row.id === id));
    },
    async commit(transactions) {
      batches.push(transactions);
    },
    recordUndo() {},
  };
  const definition: ActionDefinition = {
    id: "folders",
    name: "File and Rate",
    steps: [
      { kind: "add-folders", folderIds: ["folder-new", "folder-new"] },
      { kind: "remove-folders", folderIds: ["folder-old"] },
      { kind: "rating", rating: 5 },
    ],
  };
  const preview = await prepareAction(definition, ["z"], runtime);
  expect(preview.changes[0]?.after.folderIds).toEqual(["folder-new"]);
  expect(await runAction(definition, ["z"], preview.token, runtime)).toBe(1);
  expect(batches).toHaveLength(1);
  expect(batches[0]).toEqual([
    expect.objectContaining({
      model: "save",
      id: "z",
      patch: expect.objectContaining({ rating: 5 }),
    }),
    expect.objectContaining({
      model: "save_folder",
      id: "z",
      patch: { folderIds: ["folder-new"] },
      before: { folderIds: ["folder-old"] },
    }),
  ]);
  const membership = batches[0]?.[1];
  if (!membership) throw new Error("Missing membership transaction");
  expect(inverse(membership)).toMatchObject({
    model: "save_folder",
    patch: { folderIds: ["folder-old"] },
    before: { folderIds: ["folder-new"] },
  });
});

it("normalizes tag actions and commits registry rows with Save changes as one undoable batch", async () => {
  const batches: Transaction[][] = [];
  const undo: Transaction[][] = [];
  const now = new Date("2026-09-08T12:00:00Z");
  const runtime: ActionRuntime = {
    async read() {
      return structuredClone(rows);
    },
    async prepareTags(names) {
      return planTagRegistryUpdates(
        names,
        [{ id: "existing-tag", name: "Reviewed", lastUsedAt: null }],
        now,
      );
    },
    async commit(transactions) {
      batches.push(transactions);
    },
    recordUndo(transactions) {
      undo.push(transactions);
    },
  };
  const definition: ActionDefinition = {
    id: "tag-registry",
    name: "Tag",
    steps: [
      { kind: "remove-tags", tags: ["#OLD"] },
      { kind: "add-tags", tags: [" #Reviewed ", "Reviewed", "#New"] },
    ],
  };
  const preview = await prepareAction(definition, ["z", "a"], runtime);
  expect(preview.changes.map((change) => change.after.tags)).toEqual([
    ["Reviewed", "New"],
    ["Reviewed", "New"],
  ]);
  await runAction(definition, ["z", "a"], preview.token, runtime);
  expect(batches).toHaveLength(1);
  expect(batches[0]).toEqual([
    expect.objectContaining({
      kind: "update",
      model: "tag",
      id: "existing-tag",
      patch: { lastUsedAt: now },
      before: { lastUsedAt: null },
    }),
    expect.objectContaining({
      kind: "create",
      model: "tag",
      data: expect.objectContaining({ name: "New", lastUsedAt: now }),
    }),
    expect.objectContaining({ kind: "update", model: "save", id: "z" }),
    expect.objectContaining({ kind: "update", model: "save", id: "a" }),
  ]);
  expect(undo).toEqual(batches);
  expect(undo[0]?.map(inverse).reverse()).toEqual([
    expect.objectContaining({
      model: "save",
      id: "a",
      patch: expect.objectContaining({ tags: [] }),
    }),
    expect.objectContaining({
      model: "save",
      id: "z",
      patch: expect.objectContaining({ tags: ["old"] }),
    }),
    expect.objectContaining({ kind: "delete", model: "tag" }),
    expect.objectContaining({
      kind: "update",
      model: "tag",
      patch: { lastUsedAt: null },
    }),
  ]);
});
