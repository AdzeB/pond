export const NEW_ACTION_GROUPS = [
  {
    label: "Create",
    actions: [
      { id: "folder", label: "New Folder", keywords: "organize directory" },
      { id: "tag", label: "New Tag", keywords: "label organize" },
      { id: "tag-group", label: "New Tag Group", keywords: "labels organize" },
      { id: "note", label: "New Note", keywords: "text document write" },
    ],
  },
  {
    label: "Import",
    actions: [
      {
        id: "files",
        label: "Import Files",
        keywords: "from image video text media",
      },
      {
        id: "folders",
        label: "Import Folders",
        keywords: "from directory media",
      },
      {
        id: "links",
        label: "Import from Links",
        keywords: "url website bookmark save",
      },
      {
        id: "clipboard",
        label: "Import from Clipboard",
        keywords: "paste image files",
      },
      {
        id: "eagle",
        label: "Import Eagle Library",
        keywords: "migrate archive package",
      },
    ],
  },
  {
    label: "Sources",
    actions: [
      {
        id: "connect",
        label: "Connect a Source",
        keywords: "new account sync auto import",
      },
      {
        id: "watch",
        label: "Watch Account",
        keywords: "new source public auto import someone",
      },
    ],
  },
] as const;

export type NewAction = (typeof NEW_ACTION_GROUPS)[number]["actions"][number];
export type NewActionId = NewAction["id"];

export function filterNewActions(search: string) {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return NEW_ACTION_GROUPS.map((group) => ({
    label: group.label,
    actions: group.actions.filter((action) => {
      const text =
        `${group.label} ${action.label} ${action.keywords}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    }),
  })).filter((group) => group.actions.length > 0);
}
