import { AutomaticTagsDialog } from "./automatic-tags";

export type FolderTool = {
  kind: "tags";
  id: string;
  name: string;
};
export function FolderToolsDialog({
  tool,
  onClose,
}: {
  tool: FolderTool;
  onClose: () => void;
}) {
  return (
    <AutomaticTagsDialog
      folderId={tool.id}
      folderName={tool.name}
      onClose={onClose}
    />
  );
}
