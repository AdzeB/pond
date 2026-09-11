import type { Transaction } from "@pond/schema/tx";
import { expect, it } from "vitest";
import { createUndoHistory } from "./undo";

it("undoes and redoes an entire rating batch in one command", async () => {
  const ratings = new Map([
    ["a", 5],
    ["b", 5],
  ]);
  const history = createUndoHistory(async (transactions) => {
    for (const transaction of transactions) {
      if (transaction.kind !== "update" || transaction.model !== "save")
        throw new Error("Unexpected transaction");
      ratings.set(transaction.id, transaction.patch.rating ?? 0);
    }
  });
  const transactions: Transaction[] = ["a", "b"].map((id, index) => ({
    kind: "update",
    model: "save",
    id,
    patch: { rating: 5 },
    before: { rating: index + 1 },
  }));
  history.record(transactions);
  expect(await history.undo()).toBe(true);
  expect([...ratings.values()]).toEqual([1, 2]);
  expect(history.canUndo()).toBe(false);
  expect(await history.redo()).toBe(true);
  expect([...ratings.values()]).toEqual([5, 5]);
  expect(history.canRedo()).toBe(false);
});

it("keeps the batch available when undo fails and clears redo on new work", async () => {
  let failing = true;
  const history = createUndoHistory(async () => {
    if (failing) throw new Error("Library unavailable");
  });
  const transaction: Transaction = {
    kind: "update",
    model: "save",
    id: "a",
    patch: { rating: 5 },
    before: { rating: 1 },
  };
  history.record([transaction]);
  expect(await history.undo()).toBe(false);
  expect(history.canUndo()).toBe(true);
  expect(history.canRedo()).toBe(false);
  failing = false;
  expect(await history.undo()).toBe(true);
  history.record([transaction]);
  expect(history.canRedo()).toBe(false);
});

it("does not carry in-flight undo history into another library", async () => {
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const history = createUndoHistory(async () => {
    entered.resolve();
    await release.promise;
  });
  history.record([
    {
      kind: "update",
      model: "save",
      id: "old-library",
      patch: { rating: 5 },
      before: { rating: 1 },
    },
  ]);
  const pending = history.undo();
  await entered.promise;
  history.clear();
  release.resolve();
  await pending;
  expect(history.canUndo()).toBe(false);
  expect(history.canRedo()).toBe(false);
});
