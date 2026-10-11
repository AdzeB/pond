import { AutomaticTagsDialog } from "./automatic-tags";
import { MoveFoldersDialog } from "./move-folders";

export type FolderTool = {
  kind: "tags" | "move";
  id: string;
  name: string;
  ids?: string[];
};
export function FolderToolsDialog({
  tool,
  onClose,
}: {
  tool: FolderTool;
  onClose: () => void;
}) {
  if (tool.kind === "tags")
    return (
      <AutomaticTagsDialog
        folderId={tool.id}
        folderName={tool.name}
        onClose={onClose}
      />
    );
  return <MoveFoldersDialog ids={tool.ids ?? [tool.id]} onClose={onClose} />;
}
