import { ContextMenu, Menu, type MenuItemSpec } from "@pond/ui";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { filterMenuItems, hasVisibleMenuItems } from "./filter";
import styles from "./styles.module.css";

type RootProps = ComponentProps<typeof ContextMenu.Root>;
type OpenChangeDetails = Parameters<NonNullable<RootProps["onOpenChange"]>>[1];

interface PopupStyle extends CSSProperties {
  "--ds-popup-width"?: string;
  "--ds-popup-min-width": string;
}

const DEFAULT_POPUP_STYLE: PopupStyle = {
  "--ds-popup-min-width": "180px",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('input, textarea, [contenteditable="true"]') != null;
}

export interface SpecMenuChromeProps {
  buildItems: () => MenuItemSpec[];
  search?: boolean;
  searchLabel?: string;
  onOpen?: (eventDetails: OpenChangeDetails) => void;
  className?: string;
  minWidth?: string;
  children: ReactElement;
}

function EmptyMatch({
  Item,
  ItemLabel,
}: {
  Item: typeof ContextMenu.Item;
  ItemLabel: typeof ContextMenu.ItemLabel;
}) {
  return (
    <Item disabled>
      <ItemLabel>No matching operations</ItemLabel>
    </Item>
  );
}

function useMenuBodyHeight<LayoutKey>(
  bodyRef: RefObject<HTMLDivElement | null>,
  layoutKey: LayoutKey,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [sized, setSized] = useState(false);

  useLayoutEffect(() => {
    void layoutKey;
    const content = contentRef.current;
    const body = bodyRef.current;
    if (!content || !body) return;
    const popup = body.parentElement;
    if (!popup) return;

    const measure = () => {
      const cap = Number.parseFloat(getComputedStyle(popup).maxHeight);
      const next = Math.min(
        content.offsetHeight,
        Number.isFinite(cap) && cap > 0 ? cap : content.offsetHeight,
      );
      if (next <= 0) return;
      setHeight((prev) => (prev === next ? prev : next));
      const width = popup.offsetWidth;
      if (width <= 0) return;
      const locked = Number.parseFloat(
        popup.style.getPropertyValue("--popup-locked-width"),
      );
      if (!Number.isFinite(locked) || width > locked) {
        const nextWidth = `${width}px`;
        popup.style.setProperty("--popup-locked-width", nextWidth);
        popup.style.setProperty("--ds-popup-width", nextWidth);
        popup.style.setProperty("--ds-popup-min-width", nextWidth);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [bodyRef, layoutKey]);

  useEffect(() => {
    if (height == null) return;
    const id = requestAnimationFrame(() => setSized(true));
    return () => cancelAnimationFrame(id);
  }, [height]);

  const style: CSSProperties & { "--body-height"?: string } = {};
  if (height != null) style["--body-height"] = `${height}px`;
  return { contentRef, sized, style };
}

function SearchResults({
  items,
  Item,
  ItemLabel,
  Items,
}: {
  items: MenuItemSpec[];
  Item: typeof ContextMenu.Item;
  ItemLabel: typeof ContextMenu.ItemLabel;
  Items: typeof ContextMenu.Items;
}) {
  const scrollFade = useScrollFade<HTMLDivElement>("y");
  const { contentRef, sized, style } = useMenuBodyHeight(scrollFade.ref, items);

  return (
    <div
      className={styles.body}
      data-menu-body=""
      data-sized={sized || undefined}
      style={style}
      {...scrollFade}
    >
      <div ref={contentRef}>
        {hasVisibleMenuItems(items) ? (
          <Items items={items} />
        ) : (
          <EmptyMatch Item={Item} ItemLabel={ItemLabel} />
        )}
      </div>
    </div>
  );
}

function useFilteredItems(buildItems: () => MenuItemSpec[], query: string) {
  return filterMenuItems(buildItems(), query);
}

export function SpecContextMenu({
  buildItems,
  search = false,
  searchLabel = "Search operations",
  onOpen,
  className,
  minWidth,
  children,
}: SpecMenuChromeProps) {
  const [query, setQuery] = useState("");
  const items = useFilteredItems(buildItems, query);
  const popupStyle: PopupStyle = minWidth
    ? { "--ds-popup-width": minWidth, "--ds-popup-min-width": minWidth }
    : DEFAULT_POPUP_STYLE;

  return (
    <ContextMenu.Root
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          setQuery("");
          return;
        }
        if (isEditableTarget(eventDetails.event?.target ?? null)) {
          eventDetails.cancel();
          return;
        }
        onOpen?.(eventDetails);
      }}
    >
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner style={popupStyle}>
          <ContextMenu.Popup
            className={className ?? (search ? styles.popup : undefined)}
          >
            {search ? (
              <>
                <ContextMenu.Input
                  autoFocus
                  aria-label={searchLabel}
                  placeholder="Search…"
                  value={query}
                  onValueChange={setQuery}
                />
                <SearchResults
                  items={items}
                  Item={ContextMenu.Item}
                  ItemLabel={ContextMenu.ItemLabel}
                  Items={ContextMenu.Items}
                />
              </>
            ) : (
              <ContextMenu.Items items={items} />
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface SpecMenuProps {
  buildItems: () => MenuItemSpec[];
  search?: boolean;
  searchLabel?: string;
  onOpen?: () => void;
  className?: string;
  align?: "start" | "center" | "end";
  children: ReactElement;
}

export function SpecMenu({
  buildItems,
  search = false,
  searchLabel = "Search operations",
  onOpen,
  className,
  align = "start",
  children,
}: SpecMenuProps) {
  const [query, setQuery] = useState("");
  const items = useFilteredItems(buildItems, query);

  return (
    <Menu.Root
      onOpenChange={(next) => {
        if (!next) {
          setQuery("");
          return;
        }
        onOpen?.();
      }}
    >
      {children}
      <Menu.Portal>
        <Menu.Positioner align={align} sideOffset={6}>
          <Menu.Popup
            className={className ?? (search ? styles.popup : undefined)}
          >
            {search ? (
              <>
                <Menu.Input
                  autoFocus
                  aria-label={searchLabel}
                  placeholder="Search…"
                  value={query}
                  onValueChange={setQuery}
                />
                <SearchResults
                  items={items}
                  Item={Menu.Item}
                  ItemLabel={Menu.ItemLabel}
                  Items={Menu.Items}
                />
              </>
            ) : (
              <Menu.Items items={items} />
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
