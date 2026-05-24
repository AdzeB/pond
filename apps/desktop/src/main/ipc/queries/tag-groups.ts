import type { QueryHandlerMap } from "../helpers";

export const tagGroupsQueries: QueryHandlerMap = {
  async "tagGroups.list"() {
    const { listGroups } = await import("../../core/tag-groups");
    return await listGroups();
  },

  async "tagGroups.create"(params) {
    const { createGroup } = await import("../../core/tag-groups");
    return await createGroup({
      name: String(params.name ?? ""),
      color: params.color ? String(params.color) : null,
    });
  },

  async "tagGroups.rename"(params) {
    const { renameGroup } = await import("../../core/tag-groups");
    return await renameGroup(
      String(params.from ?? ""),
      String(params.to ?? ""),
    );
  },

  async "tagGroups.update"(params) {
    const { updateGroup } = await import("../../core/tag-groups");
    const name = String(params.name ?? "");
    const patch = (params.patch as Record<string, unknown>) ?? {};
    return await updateGroup(name, patch);
  },

  async "tagGroups.delete"(params) {
    const { deleteGroup } = await import("../../core/tag-groups");
    return await deleteGroup(String(params.name ?? ""));
  },

  async "tagGroups.addTags"(params) {
    const { addTagsToGroup } = await import("../../core/tag-groups");
    const tags = Array.isArray(params.tags) ? (params.tags as string[]) : [];
    return await addTagsToGroup(tags, String(params.group ?? ""));
  },

  async "tagGroups.removeTag"(params) {
    const { removeTagFromGroup } = await import("../../core/tag-groups");
    return await removeTagFromGroup(
      String(params.tag ?? ""),
      String(params.group ?? ""),
    );
  },

  async "tagGroups.reorder"(params) {
    const { reorderGroups } = await import("../../core/tag-groups");
    const order = Array.isArray(params.order) ? (params.order as string[]) : [];
    return await reorderGroups(order);
  },
};
