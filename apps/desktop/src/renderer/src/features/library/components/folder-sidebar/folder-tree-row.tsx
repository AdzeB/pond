import { IconChevronRightOutline12 } from "@pond/icons/outline/12";
import type { Folder } from "@pond/schema/db";
import { Button, cssVars } from "@pond/ui";
import { useState } from "react";
import { FolderContextMenu } from "@/features/library/components/folder-context-menu/folder-context-menu";
import type { FolderTool } from "@/features/library/components/folder-tools";
import { FolderUnlockDialog } from "@/features/library/components/folder-unlock-dialog";
import { enterFolder } from "@/features/library/operations/enter-folder";
import { folders } from "@/features/library/state/folders";
import type { LibraryNav } from "@/features/library/state/library-chrome";
import { FolderCover } from "./folder-cover";
import { type FolderIconId, folderColorCss } from "./folder-icons";
import { FolderNameEditor } from "./folder-name-editor";
import { buildFolderRowMenuItems } from "./folder-row-menu";
import { Row } from "./row";
import styles from "./styles.module.css";
import type {
  FolderDropState,
  useFolderDragDrop,
} from "./use-folder-drag-drop";

type FolderDragHandlers = ReturnType<
  ReturnType<typeof useFolderDragDrop>["handlersFor"]
>;

interface FolderTreeRowProps {
  collapsed: boolean;
  count: number;
  coverSaveId?: string | null;
  creating: boolean;
  depth: number;
  doubleClickBehavior: "open" | "expand-collapse";
  editing: boolean;
  exportIds: string[];
  folder: Folder;
  folderDrop: FolderDropState | null;
  folderIcon?: FolderIconId;
  hasChildren: boolean;
  includeSubfolders: boolean;
  dragging: boolean;
  nav: LibraryNav;
  quickAccess: boolean;
  sameLevelHasChildren: boolean;
  viewing: boolean;
  dragHandlers: FolderDragHandlers;
  onCreateFolder: (parentId?: string) => void;
  onCustomize: () => void;
  onFinishEditing: () => void;
  onOpenTool: (tool: FolderTool) => void;
  onStartEditing: (id: string) => void;
  onToggleAll: () => void;
  onToggleFolder: () => void;
  onToggleSameLevel: (expanded: boolean) => void;
}

export function FolderTreeRow(props: FolderTreeRowProps) {
  const { folder } = props;
  const [unlock, setUnlock] = useState<{
    folderId: string;
    hint: string | null;
  } | null>(null);
  const colorCss = folderColorCss(folder.color);
  const count =
    props.count > 0 && (props.collapsed || !props.hasChildren)
      ? props.count
      : undefined;
  return (
    <>
      <FolderContextMenu
        buildItems={() =>
          buildFolderRowMenuItems({
            collapsed: props.collapsed,
            creating: props.creating,
            exportIds: props.exportIds,
            folder,
            folderIcon: props.folderIcon,
            hasChildren: props.hasChildren,
            includeSubfolders: props.includeSubfolders,
            nav: props.nav,
            quickAccess: props.quickAccess,
            sameLevelHasChildren: props.sameLevelHasChildren,
            viewing: props.viewing,
            onCreateFolder: props.onCreateFolder,
            onCustomize: props.onCustomize,
            onOpenTool: props.onOpenTool,
            onStartEditing: props.onStartEditing,
            onToggleAll: props.onToggleAll,
            onToggleFolder: props.onToggleFolder,
            onToggleSameLevel: props.onToggleSameLevel,
          })
        }
      >
        <div
          className={styles.trigger}
          data-drop={
            props.folderDrop?.id === folder.id
              ? props.folderDrop.kind
              : undefined
          }
          data-dragging={props.dragging || undefined}
          style={cssVars({ "--folder-depth": props.depth })}
        >
          {props.hasChildren ? (
            <Button
              icon
              size="xs"
              variant="text"
              className={styles.disclosure}
              aria-label={`${props.collapsed ? "Expand" : "Collapse"} ${folder.name}`}
              aria-expanded={!props.collapsed}
              onClick={(event) => {
                event.stopPropagation();
                props.onToggleFolder();
              }}
            >
              <IconChevronRightOutline12 strokeWidth={2} />
            </Button>
          ) : null}
          {props.editing ? (
            <FolderNameEditor
              name={folder.name}
              onSave={async (name) => {
                const result = await window.pond.query("folders.rename", {
                  id: folder.id,
                  name,
                });
                if (!result.ok) throw new Error("Couldn't rename folder");
                await folders.refresh();
              }}
              onFinish={props.onFinishEditing}
            />
          ) : (
            <Row
              label={folder.name}
              className={styles.row}
              icon={
                <span style={colorCss ? { color: colorCss } : undefined}>
                  <FolderCover
                    icon={props.folderIcon}
                    coverSaveId={props.coverSaveId}
                  />
                </span>
              }
              depth={props.depth}
              count={count}
              active={props.viewing}
              onDoubleClick={(event) => {
                if (
                  props.doubleClickBehavior !== "expand-collapse" ||
                  !props.hasChildren
                ) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                props.onToggleFolder();
              }}
              onClick={() => {
                void enterFolder(folder.id, (request) =>
                  setUnlock({
                    folderId: request.unlockId,
                    hint: request.hint,
                  }),
                );
              }}
              {...props.dragHandlers}
            />
          )}
        </div>
      </FolderContextMenu>
      {unlock ? (
        <FolderUnlockDialog
          folderId={unlock.folderId}
          folderName={folder.name}
          hint={unlock.hint}
          onClose={() => setUnlock(null)}
          onUnlocked={() => {
            setUnlock(null);
            void enterFolder(folder.id, (request) =>
              setUnlock({
                folderId: request.unlockId,
                hint: request.hint,
              }),
            );
          }}
        />
      ) : null}
    </>
  );
}
