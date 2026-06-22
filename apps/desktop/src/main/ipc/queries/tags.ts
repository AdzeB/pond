import type { QueryHandlerMap } from "../helpers";

export const tagsQueries: QueryHandlerMap = {
  async "tags.list"() {
    const { listTags } = await import("../../core/tags");
    return await listTags();
  },

  async "tags.create"(params) {
    const { createTag } = await import("../../core/tags");
    return await createTag({
      name: String(params.name ?? ""),
    });
  },

  async "tags.rename"(params) {
    const { renameTag } = await import("../../core/tags");
    return await renameTag(String(params.from ?? ""), String(params.to ?? ""));
  },

  async "tags.merge"(params) {
    const { mergeTags } = await import("../../core/tags");
    return await mergeTags(String(params.from ?? ""), String(params.to ?? ""));
  },

  async "tags.update"(params) {
    const { updateTag } = await import("../../core/tags");
    const patch = (params.patch as Record<string, unknown>) ?? {};
    return await updateTag(String(params.name ?? ""), {
      ...("archived" in patch ? { archived: Boolean(patch.archived) } : {}),
      ...("starred" in patch ? { starred: Boolean(patch.starred) } : {}),
    });
  },

  async "tags.delete"(params) {
    const { deleteTag } = await import("../../core/tags");
    return await deleteTag(String(params.name ?? ""));
  },

  async "tags.setForSave"(params) {
    const { setSaveTags } = await import("../../core/tags");
    return await setSaveTags(
      String(params.saveId ?? ""),
      Array.isArray(params.tags) ? (params.tags as string[]) : [],
    );
  },
};
