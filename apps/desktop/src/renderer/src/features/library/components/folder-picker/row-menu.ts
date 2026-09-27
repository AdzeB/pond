import type { MenuItemSpec } from "@pond/ui";

export function buildFolderPickerRowItems({
  recent,
  onCreateBelow,
  onCreateSubfolder,
  onRemoveRecent,
}: {
  recent: boolean;
  onCreateBelow: () => void;
  onCreateSubfolder: () => void;
  onRemoveRecent: () => void;
}): MenuItemSpec[] {
  return [
    { label: "New Subfolder", onClick: onCreateSubfolder },
    { label: "New Folder Below", onClick: onCreateBelow },
    { type: "separator" },
    {
      label: "Remove from Recent",
      hidden: !recent,
      onClick: onRemoveRecent,
    },
  ];
}
