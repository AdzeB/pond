import { z } from "zod";
import {
  ActionDefinitionSchema,
  ActionRequestSchema,
  ActionRunSchema,
} from "../../../shared/action-contracts";
import {
  deleteAction,
  prepareAction,
  readActions,
  runAction,
  saveAction,
} from "../../core/library-actions";
import { query } from "./params";
export const actionQueries = {
  "actions.list": query(z.object({}), () => readActions()),
  "actions.save": query(
    z.object({ definition: ActionDefinitionSchema }),
    ({ definition }) => saveAction(definition),
  ),
  "actions.delete": query(z.object({ id: z.string().min(1) }), ({ id }) => {
    deleteAction(id);
    return { ok: true as const };
  }),
  "actions.preview": query(ActionRequestSchema, ({ definition, ids }) =>
    prepareAction(definition, ids),
  ),
  "actions.run": query(
    ActionRunSchema,
    async ({ definition, ids, expectedToken }) => ({
      changed: await runAction(definition, ids, expectedToken),
    }),
  ),
};
