import { IconDotsFill18 as Dots } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import type { MouseEvent } from "react";
import { TagColorPicker } from "@/components/tags/color-picker";
import { colorForName, focusInput } from "../helpers";
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
    setColor,
  } = useTagRow();
  const isGroup = row.kind === "group";
  const name = isGroup ? row.group.name : row.tag.name;

  return (
    <span className={styles.name}>
      {isGroup ? (
        <TagColorPicker
          label={name}
          color={row.group.color}
          fallback={colorForName(name)}
          onSelect={setColor}
        />
      ) : null}
      {renaming ? (
        <input
          ref={focusInput}
          className={styles["name-input"]}
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
        <span className={styles["name-text"]}>{name}</span>
      )}
    </span>
  );
}

export function ActionsCell() {
  const { renaming, menuItems } = useTagRow();
  if (renaming) return null;
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            className={styles["action-button"]}
            aria-label="More actions"
            onClick={stop}
          />
        }
      >
        <Dots width={14} height={14} />
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
