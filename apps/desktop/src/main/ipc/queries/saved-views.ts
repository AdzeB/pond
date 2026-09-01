import { z } from "zod";
import {
  NonEmptyTextParam,
  NullableStringParam,
  type QueryHandlerMap,
  QueryParam,
  query,
  StringListParam,
  StringParam,
} from "./params";

export const savedViewsQueries: QueryHandlerMap = {
  async "savedViews.list"() {
    const { listViews } = await import("../../core/saved-views");
    return await listViews();
  },

  "savedViews.create": query(
    z.object({
      name: StringParam,
      question: NullableStringParam,
      query: QueryParam,
      sortKey: NonEmptyTextParam,
      sortDir: NonEmptyTextParam,
      layout: NullableStringParam,
    }),
    async (params) => {
      const { createView } = await import("../../core/saved-views");
      return await createView({
        name: params.name,
        question: params.question,
        query: params.query ?? undefined,
        sortKey: params.sortKey ?? undefined,
        sortDir: params.sortDir ?? undefined,
        layout: params.layout,
      });
    },
  ),

  "savedViews.rename": query(
    z.object({ id: StringParam, name: StringParam }),
    async (params) => {
      const { renameView } = await import("../../core/saved-views");
      return await renameView(params.id, params.name);
    },
  ),

  "savedViews.update": query(
    z.object({
      id: StringParam,
      patch: z
        .object({
          name: z.string().optional(),
          question: z.string().nullable().optional(),
          query: QueryParam.transform((value) => value ?? undefined).optional(),
          sortKey: z.string().optional(),
          sortDir: z.string().optional(),
          layout: z.string().nullable().optional(),
          sortOrder: z.number().optional(),
        })
        .catch({}),
    }),
    async (params) => {
      const { updateView } = await import("../../core/saved-views");
      return await updateView(params.id, params.patch);
    },
  ),

  "savedViews.delete": query(z.object({ id: StringParam }), async (params) => {
    const { deleteView } = await import("../../core/saved-views");
    return await deleteView(params.id);
  }),

  "savedViews.reorder": query(
    z.object({ ids: StringListParam }),
    async (params) => {
      const { reorderViews } = await import("../../core/saved-views");
      return await reorderViews(params.ids);
    },
  ),
};
