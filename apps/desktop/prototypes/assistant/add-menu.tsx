import {
  IconAlbum2Outline18,
  IconFileOutline18,
  IconFolderOutline18,
  IconLink2Outline18,
  IconPlusOutline18,
  IconTagsOutline18,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui/menu";
import { Tooltip } from "@pond/ui/tooltip";
import { type ReactNode, type RefObject, useRef } from "react";

function MenuRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <Menu.Item className="assistant-add-row" onClick={onClick}>
      <span className="add-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="add-row-title">{title}</span>
      <span className="add-row-detail">{detail}</span>
    </Menu.Item>
  );
}

export function AddMenu({
  referencedCount,
  folders,
  composerRef,
  anchorRef,
  onSaves,
  onFolder,
  onReferenced,
  onAction,
}: {
  referencedCount: number;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  anchorRef: RefObject<HTMLDivElement | null>;
  folders: { name: string; count: number }[];
  onSaves: () => void;
  onFolder: (name: string) => void;
  onReferenced: () => void;
  onAction: (action: "summarize" | "connect" | "organize") => void;
}) {
  const focusDestination = useRef<"trigger" | "composer" | "dialog">("trigger");
  function run(action: () => void) {
    focusDestination.current = "composer";
    action();
  }
  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) focusDestination.current = "trigger";
      }}
    >
      <Tooltip label="Add Context or Action">
        <Menu.Trigger
          icon
          size="xs"
          variant="ghost"
          className="assistant-add-trigger"
          aria-label="Add Context or Action"
        >
          <IconPlusOutline18 />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner
          anchor={anchorRef}
          side="top"
          align="start"
          sideOffset={8}
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
        >
          <Menu.Popup
            className="assistant-add-menu"
            finalFocus={() =>
              focusDestination.current === "composer"
                ? composerRef.current
                : focusDestination.current !== "dialog"
            }
          >
            <Menu.Group>
              <Menu.GroupLabel className="add-menu-heading">
                Add
              </Menu.GroupLabel>
              <MenuRow
                icon={<IconAlbum2Outline18 />}
                title="Saves from Library"
                detail="Choose saved items"
                onClick={() => {
                  focusDestination.current = "dialog";
                  onSaves();
                }}
              />
              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className="assistant-add-row">
                  <span className="add-row-icon" aria-hidden="true">
                    <IconFolderOutline18 />
                  </span>
                  <span className="add-row-title">Folder</span>
                  <span className="add-row-detail">Include its Saves</span>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="inline-end"
                    align="start"
                    sideOffset={6}
                  >
                    <Menu.Popup className="assistant-folder-menu">
                      <Menu.SectionLabel>Library Folders</Menu.SectionLabel>
                      {folders.map(({ name, count }) => (
                        <Menu.Item
                          key={name}
                          className="assistant-folder-row"
                          disabled={count === 0}
                          onClick={() => run(() => onFolder(name))}
                        >
                          <IconFolderOutline18 />
                          <span>{name}</span>
                          <small>
                            {count} {count === 1 ? "Save" : "Saves"}
                          </small>
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
              {referencedCount ? (
                <MenuRow
                  icon={<IconLink2Outline18 />}
                  title="Referenced Saves"
                  detail={`${referencedCount} from this response`}
                  onClick={() => run(onReferenced)}
                />
              ) : null}
            </Menu.Group>
            <Menu.Group>
              <Menu.GroupLabel className="add-menu-heading">
                Actions
              </Menu.GroupLabel>
              <MenuRow
                icon={<IconFileOutline18 />}
                title="Summarize"
                detail="Pull out the main ideas"
                onClick={() => run(() => onAction("summarize"))}
              />
              <MenuRow
                icon={<IconLink2Outline18 />}
                title="Connect Ideas"
                detail="Find shared themes"
                onClick={() => run(() => onAction("connect"))}
              />
              <MenuRow
                icon={<IconTagsOutline18 />}
                title="Organize Saves"
                detail="Review titles, tags, and folders"
                onClick={() => run(() => onAction("organize"))}
              />
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
