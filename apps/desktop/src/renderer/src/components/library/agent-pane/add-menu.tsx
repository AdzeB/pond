import {
  IconAlbum2Outline18,
  IconLink2Outline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import { Menu, Tooltip } from "@pond/ui";
import { type ReactNode, type RefObject, useRef } from "react";
import { ASSISTANT_ACTIONS, type AssistantAction } from "./actions";
import styles from "./styles.module.css";

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
    <Menu.Item className={styles["assistant-add-row"]} onClick={onClick}>
      <span className={styles["add-row-icon"]} aria-hidden="true">
        {icon}
      </span>
      <span className={styles["add-row-title"]}>{title}</span>
      <span className={styles["add-row-detail"]}>{detail}</span>
    </Menu.Item>
  );
}

export function AddMenu({
  referencedCount,
  composerRef,
  anchorRef,
  onSaves,
  onReferenced,
  onAction,
}: {
  referencedCount: number;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  anchorRef: RefObject<HTMLDivElement | null>;
  onSaves: () => void;
  onReferenced: () => void;
  onAction: (action: AssistantAction) => void;
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
          className={styles["assistant-add-trigger"]}
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
            className={styles["assistant-add-menu"]}
            finalFocus={() =>
              focusDestination.current === "composer"
                ? composerRef.current
                : focusDestination.current !== "dialog"
            }
          >
            <Menu.Group>
              <Menu.GroupLabel className={styles["add-menu-heading"]}>
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
              <Menu.GroupLabel className={styles["add-menu-heading"]}>
                Actions
              </Menu.GroupLabel>
              {ASSISTANT_ACTIONS.map((action) => (
                <MenuRow
                  key={action.id}
                  icon={<action.icon />}
                  title={action.title}
                  detail={action.detail}
                  onClick={() => run(() => onAction(action.id))}
                />
              ))}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
