import { IconTrash2Outline18 as Trash2 } from "@pond/icons/outline/18";
import { ContextMenu } from "@pond/ui";
import type { ReactElement } from "react";
import styles from "./styles.module.css";

const GROUP_COLORS = [
  "var(--ds-red-9)",
  "var(--ds-orange-9)",
  "var(--ds-amber-9)",
  "var(--ds-green-9)",
  "var(--ds-teal-9)",
  "var(--ds-blue-9)",
  "var(--ds-violet-9)",
  "var(--ds-pink-9)",
] as const;

interface TagGroupContextMenuProps {
  onRename: () => void;
  onSetColor: (color: string | null) => void;
  onRequestDelete: () => void;
  children: ReactElement;
}

export function TagGroupContextMenu({
  onRename,
  onSetColor,
  onRequestDelete,
  children,
}: TagGroupContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Backdrop />
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.Item onClick={onRename}>
              <ContextMenu.ItemLabel>Rename</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger>
                <ContextMenu.ItemLabel>Color</ContextMenu.ItemLabel>
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner
                  align="start"
                  side="right"
                  sideOffset={6}
                >
                  <ContextMenu.Popup className={styles["color-popup"]}>
                    <div className={styles["color-grid"]}>
                      {GROUP_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={styles["color-swatch"]}
                          style={{ background: c }}
                          aria-label={`Use ${c}`}
                          onClick={() => onSetColor(c)}
                        />
                      ))}
                    </div>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onClick={() => onSetColor(null)}>
                      <ContextMenu.ItemLabel>Clear color</ContextMenu.ItemLabel>
                    </ContextMenu.Item>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={onRequestDelete}>
              <ContextMenu.ItemIcon>
                <Trash2 width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Remove</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
