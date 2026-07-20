import { ContextMenu, type MenuItemSpec } from "@pond/ui";
import type { CSSProperties, ReactElement } from "react";

type RootProps = React.ComponentProps<typeof ContextMenu.Root>;
type OpenChangeDetails = Parameters<NonNullable<RootProps["onOpenChange"]>>[1];

/** Sizing mirrors a native menu: hug the widest item but never get too narrow. */
const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "180px",
} as CSSProperties;

interface SpecContextMenuProps {
  /** Called only while the menu is open, so items can read stores lazily without subscribing. */
  buildItems: () => MenuItemSpec[];
  /** Fires as the menu opens, e.g. to capture the element under the cursor. */
  onOpen?: (eventDetails: OpenChangeDetails) => void;
  /** Becomes the trigger via the render prop; its handlers and props are merged, not replaced. */
  children: ReactElement<Record<string, unknown>>;
}

/** LazyItems only mounts while the popup is open, deferring buildItems until then. */
function LazyItems({ build }: { build: () => MenuItemSpec[] }) {
  return <ContextMenu.Items items={build()} />;
}

/** Editable fields get the native cut/copy/paste menu from the main process instead. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('input, textarea, [contenteditable="true"]') != null;
}

export function SpecContextMenu({
  buildItems,
  onOpen,
  children,
}: SpecContextMenuProps) {
  return (
    <ContextMenu.Root
      onOpenChange={(open, eventDetails) => {
        if (!open) return;
        if (isEditableTarget(eventDetails.event?.target ?? null)) {
          eventDetails.cancel();
          return;
        }
        onOpen?.(eventDetails);
      }}
    >
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner style={POPUP_STYLE}>
          <ContextMenu.Popup>
            <LazyItems build={buildItems} />
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
