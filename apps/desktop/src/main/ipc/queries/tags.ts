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
      ...("starred" in patch ? { starred: Boolean(patch.starred) } : {}),
      ...("description" in patch
        ? {
            description:
              patch.description == null ? null : String(patch.description),
          }
        : {}),
      ...("color" in patch
        ? { color: patch.color == null ? null : String(patch.color) }
        : {}),
    });
  },

  async "tags.delete"(params) {
    const { deleteTag } = await import("../../core/tags");
    return await deleteTag(String(params.name ?? ""));
  },

  async "tags.convertToGroup"(params) {
    const { createGroup } = await import("../../core/tag-groups");
    const { deleteTag } = await import("../../core/tags");
    const name = String(params.name ?? "").trim();
    if (!name) return { ok: false };
    const created = await createGroup({ name });
    if (!created.ok) return { ok: false };
    await deleteTag(name);
    return { ok: true };
  },

  async "tags.setForSave"(params) {
    const { setSaveTags } = await import("../../core/tags");
    return await setSaveTags(
      String(params.saveId ?? ""),
      Array.isArray(params.tags) ? (params.tags as string[]) : [],
    );
  },
};
