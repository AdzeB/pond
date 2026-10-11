import { IconAscendingSorting, IconEyeFill, IconGrid } from "@pond/icons";
import { Button, Popover, Tooltip } from "@pond/ui";
import type { ReactNode } from "react";
import {
  libraryHeader,
  useViewPopover,
  type ViewPopover,
} from "@/features/library/state/library-header";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import { DisplayOptions, LayoutOptions, SortOptions } from "./board";
import styles from "./styles.module.css";

const MENUS: Array<{
  id: ViewPopover;
  label: string;
  shortcut?: "view.options" | "view.display";
  menu: "layout" | "sort" | "display";
  icon: ReactNode;
}> = [
  {
    id: "layout",
    label: "Layout",
    shortcut: "view.options",
    menu: "layout",
    icon: <IconGrid />,
  },
  {
    id: "sort",
    label: "Sort",
    menu: "sort",
    icon: <IconAscendingSorting />,
  },
  {
    id: "display",
    label: "Display",
    shortcut: "view.display",
    menu: "display",
    icon: <IconEyeFill />,
  },
];

export function ViewMenu() {
  const open = useViewPopover();

  return (
    <>
      {MENUS.map((menu) => (
        <OptionMenu
          key={menu.id}
          id={menu.id}
          label={menu.label}
          shortcut={menu.shortcut}
          menu={menu.menu}
          icon={menu.icon}
          open={open === menu.id}
        />
      ))}
    </>
  );
}

function OptionMenu({
  id,
  label,
  shortcut,
  menu,
  icon,
  open,
}: {
  id: ViewPopover;
  label: string;
  shortcut?: "view.options" | "view.display";
  menu: "layout" | "sort" | "display";
  icon: ReactNode;
  open: boolean;
}) {
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) libraryHeader.openPopover(id);
        else libraryHeader.closePopover(id);
      }}
    >
      <Tooltip
        label={label}
        shortcut={shortcut ? <ShortcutKeys id={shortcut} /> : undefined}
        side="bottom"
      >
        <Button
          render={<Popover.Trigger />}
          icon
          size="sm"
          variant="ghost"
          aria-label={label}
        >
          {icon}
        </Button>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup
            className={styles.popup}
            data-menu={menu}
            aria-label={label}
          >
            {id === "layout" ? <LayoutOptions /> : null}
            {id === "sort" ? <SortOptions /> : null}
            {id === "display" ? <DisplayOptions /> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
