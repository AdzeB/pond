import { BulkEditSchema } from "../../../shared/bulk-contracts";
import { bulkEditSaves } from "../../core/bulk-saves";
import { executeBatch, withMutationScope } from "../../core/executor";
import { recordBatchForUndo } from "../../core/undo";
import { getDb } from "../../db";
import { query } from "./params";

export const bulkQueries = {
  "saves.bulkEdit": query(BulkEditSchema, (input) =>
    withMutationScope(async () =>
      bulkEditSaves(
        input,
        await getDb(),
        async (transactions) => {
          await executeBatch(transactions);
        },
        recordBatchForUndo,
      ),
    ),
  ),
};
