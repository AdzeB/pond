import { IconEyeFill18 } from "@pond/icons/fill/18";
import { Button, Popover, Tooltip } from "@pond/ui";
import { ShortcutKeys } from "@/components/shared/shortcut-keys";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { libraryHeader, useViewPopover } from "@/stores/library-header";
import { DisplaySection } from "./display";
import { LayoutSection } from "./layout";
import styles from "./styles.module.css";
import { ZoomSection } from "./zoom";

export { SortMenu } from "./sort";

export function ViewMenu() {
  const open = useViewPopover() !== null;
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) libraryHeader.openPopover("layout");
        else libraryHeader.closePopover();
      }}
    >
      <Tooltip
        label="View Options"
        shortcut={<ShortcutKeys id="view.options" />}
        side="bottom"
      >
        <Button
          render={<Popover.Trigger />}
          icon
          size="sm"
          variant="ghost"
          aria-label="View Options"
        >
          <IconEyeFill18 />
        </Button>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup
            className={styles.popup}
            aria-label="View Options"
            {...scrollFade}
          >
            <LayoutSection />
            <ZoomSection />
            <hr className={styles.separator} />
            <DisplaySection />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
