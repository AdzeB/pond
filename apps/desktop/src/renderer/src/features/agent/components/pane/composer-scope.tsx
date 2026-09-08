import {
  IconAlbum2Outline18,
  IconChevronDownOutline18,
} from "@pond/icons/outline/18";
import { Button, Menu, Toolbar } from "@pond/ui";
import {
  type AssistantComposerScope,
  assistant,
} from "@/features/agent/state/assistant";
import { useFolders } from "@/features/library/state/folders";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import trayStyles from "./composer-tray.module.css";

export function ComposerScope({
  scope,
  attachedCount,
  onOpen,
  open,
}: {
  scope: AssistantComposerScope;
  attachedCount: number;
  onOpen: () => void;
  open: boolean;
}) {
  const folders = useFolders();
  const nav = useLibraryNav();
  const folderId =
    scope.kind === "folder"
      ? scope.id
      : scope.kind === "auto" && !attachedCount && nav.kind === "folder"
        ? nav.id
        : null;
  const attached =
    scope.kind === "attachments" ||
    (scope.kind === "auto" && attachedCount > 0);
  const label = attached
    ? `${attachedCount} Attached ${attachedCount === 1 ? "Save" : "Saves"}`
    : folderId
      ? `${folders.find((folder) => folder.id === folderId)?.name ?? "Current"} Folder`
      : "Entire Library";
  return (
    <Button
      size="xs"
      variant="ghost"
      data-composer-tray-trigger
      aria-label={`Search scope, ${label}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
    >
      <IconAlbum2Outline18 />
      {label}
      <IconChevronDownOutline18 />
    </Button>
  );
}

export function ComposerScopeOptions({
  attachedCount,
  onClose,
}: {
  attachedCount: number;
  onClose: () => void;
}) {
  const folders = useFolders();
  function select(scope: AssistantComposerScope) {
    assistant.setScope(scope);
    onClose();
  }
  return (
    <Toolbar.Root
      orientation="vertical"
      aria-label="Search scope choices"
      className={trayStyles.options}
    >
      <Toolbar.Button
        render={<Menu.Row />}
        onClick={() => select({ kind: "library" })}
      >
        Entire Library
      </Toolbar.Button>
      <Toolbar.Button
        render={<Menu.Row />}
        disabled={!attachedCount}
        onClick={() => select({ kind: "attachments" })}
      >
        Attached Saves
      </Toolbar.Button>
      {folders.map((folder) => (
        <Toolbar.Button
          key={folder.id}
          render={<Menu.Row />}
          onClick={() => select({ kind: "folder", id: folder.id })}
        >
          {folder.name}
        </Toolbar.Button>
      ))}
    </Toolbar.Root>
  );
}
