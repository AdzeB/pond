import { IconSliders3Fill18 as ViewIcon } from "@pond/icons/fill/18";
import { Button, Popover, Tooltip } from "@pond/ui";
import type { ReactElement } from "react";
import { DisplaySection } from "@/components/library-view-menu-display";
import { LayoutSection } from "@/components/library-view-menu-layout";
import { SortSection } from "@/components/library-view-menu-sort";
import { ZoomSection } from "@/components/library-view-menu-zoom";
import styles from "./styles.module.css";

type PopoverAnchor = Element | null | (() => Element | null) | undefined;

interface ViewMenuProps {
  // The dock supplies its own trigger so the button matches the surrounding
  // dock items (and composes with the dock's tooltip). When omitted, a
  // standalone primary icon button is rendered.
  trigger?: ReactElement;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  // Anchor the panel to a different element than the trigger (the dock pill),
  // so it sits above the dock and inherits its width.
  anchor?: PopoverAnchor;
}

// View options as a single flat panel: Sort / Layout / Zoom / Display are all
// visible at once (no nested submenus) and apply live to the grid behind the
// popover, so the current view state reads at a glance.
export function ViewMenu({
  trigger,
  side = "bottom",
  align = "end",
  anchor,
}: ViewMenuProps) {
  return (
    <Popover.Root>
      {trigger ? (
        <Popover.Trigger render={trigger} />
      ) : (
        <Tooltip label="View options" side="bottom">
          <Popover.Trigger
            render={<Button icon variant="primary" aria-label="View options" />}
          >
            <ViewIcon />
          </Popover.Trigger>
        </Tooltip>
      )}
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side={side}
          align={align}
          sideOffset={11}
        >
          <Popover.Popup className={styles.panel}>
            <header className={styles.header}>
              <span className={styles.headerTitle}>View</span>
            </header>
            <hr className={styles.divider} />
            <LayoutSection />
            <ZoomSection />
            <hr className={styles.divider} />
            <SortSection />
            <hr className={styles.divider} />
            <DisplaySection />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
