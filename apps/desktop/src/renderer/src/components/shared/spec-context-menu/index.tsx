import { ContextMenu, type MenuItemSpec } from "@pond/ui";
import type { CSSProperties, ReactElement } from "react";

type RootProps = React.ComponentProps<typeof ContextMenu.Root>;
type OpenChangeDetails = Parameters<NonNullable<RootProps["onOpenChange"]>>[1];

const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "180px",
} as CSSProperties;

interface SpecContextMenuProps {
  buildItems: () => MenuItemSpec[];
  onOpen?: (eventDetails: OpenChangeDetails) => void;
  children: ReactElement<Record<string, unknown>>;
}

function LazyItems({ build }: { build: () => MenuItemSpec[] }) {
  return <ContextMenu.Items items={build()} />;
}

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
