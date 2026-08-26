import { IconDotsFill12 as Dots } from "@pond/icons/fill/12";
import { Menu } from "@pond/ui";
import type { MouseEvent } from "react";
import { focusInput } from "../helpers";
import { useTagRow } from "../row-context";
import styles from "./styles.module.css";

function stop(e: MouseEvent) {
  e.stopPropagation();
}

export function NameCell() {
  const {
    row,
    renaming,
    renameDraft,
    setRenameDraft,
    commitRename,
    cancelRename,
  } = useTagRow();
  const saves = row.kind === "tag" ? row.saves : 0;
  const name = row.kind === "tag" ? row.tag.name : row.group.name;

  return (
    <span className={styles.name}>
      {renaming ? (
        <input
          ref={focusInput}
          className={styles.input}
          value={renameDraft}
          spellCheck={false}
          onClick={stop}
          onChange={(e) => setRenameDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelRename();
            }
          }}
        />
      ) : (
        <span className={styles.text}>{name}</span>
      )}
      {!renaming && saves > 0 ? (
        <span className={styles.meta}>{saves}</span>
      ) : null}
    </span>
  );
}

export function ActionsCell() {
  const { renaming, menuItems } = useTagRow();
  if (renaming) return null;
  return (
    <Menu.Root>
      <Menu.Trigger
        icon
        size="xs"
        variant="ghost"
        className={styles.action}
        aria-label="More Actions"
        onClick={stop}
      >
        <Dots />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4}>
          <Menu.Popup>
            <Menu.Items items={menuItems} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
