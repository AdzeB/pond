import type { NewSavedView } from "@pond/schema/db";
import type { Query } from "@pond/schema/filters/types";
import type { QueryHandlerMap } from "../helpers";

export const savedViewsQueries: QueryHandlerMap = {
  async "savedViews.list"() {
    const { listViews } = await import("../../core/saved-views");
    return await listViews();
  },

  async "savedViews.create"(params) {
    const { createView } = await import("../../core/saved-views");
    return await createView({
      name: String(params.name ?? ""),
      question: params.question == null ? null : String(params.question),
      query: params.query as Query | undefined,
      sortKey: params.sortKey ? String(params.sortKey) : undefined,
      sortDir: params.sortDir ? String(params.sortDir) : undefined,
      layout: params.layout == null ? null : String(params.layout),
    });
  },

  async "savedViews.rename"(params) {
    const { renameView } = await import("../../core/saved-views");
    return await renameView(String(params.id ?? ""), String(params.name ?? ""));
  },

  async "savedViews.update"(params) {
    const { updateView } = await import("../../core/saved-views");
    const patch = (params.patch as Partial<NewSavedView>) ?? {};
    return await updateView(String(params.id ?? ""), patch);
  },

  async "savedViews.delete"(params) {
    const { deleteView } = await import("../../core/saved-views");
    return await deleteView(String(params.id ?? ""));
  },

  async "savedViews.reorder"(params) {
    const { reorderViews } = await import("../../core/saved-views");
    const ids = Array.isArray(params.ids) ? (params.ids as string[]) : [];
    return await reorderViews(ids);
  },
};
