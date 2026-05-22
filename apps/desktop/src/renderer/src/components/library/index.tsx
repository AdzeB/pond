import { cn } from "@pond/ui";
import { type HTMLMotionProps, motion } from "motion/react";
import { createContext, type ReactNode, use } from "react";
import { drawerSpring } from "@/lib/motion";
import styles from "./styles.module.css";

type LibraryView = "grid" | "list";
type GridLayout = "waterfall" | "grid" | "justified";

interface LibraryContextValue {
  view: LibraryView;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibraryContext(): LibraryContextValue {
  const ctx = use(LibraryContext);
  if (!ctx) {
    throw new Error("Library.* must be rendered inside <Library.Root>");
  }
  return ctx;
}

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {
  view: LibraryView;
  children: ReactNode;
}

function Root({ view, className, children, ...props }: RootProps) {
  return (
    <LibraryContext value={{ view }}>
      <div data-view={view} className={cn(styles.root, className)} {...props}>
        {children}
      </div>
    </LibraryContext>
  );
}

interface GridProps extends React.ComponentPropsWithRef<"ul"> {
  layout?: GridLayout;
  multiSelect?: boolean;
}

function Grid({
  layout = "grid",
  multiSelect,
  className,
  ...props
}: GridProps) {
  const layoutClass =
    layout === "waterfall"
      ? styles["grid-waterfall"]
      : layout === "justified"
        ? styles["grid-justified"]
        : styles["grid-grid"];
  return (
    <ul
      className={cn(
        styles.grid,
        layoutClass,
        multiSelect && styles["grid-multiselect"],
        className,
      )}
      data-layout={layout}
      data-multi-select={multiSelect ? "true" : undefined}
      {...props}
    />
  );
}

interface ListProps extends React.ComponentPropsWithoutRef<"table"> {}

function List({ className, ...props }: ListProps) {
  return <table className={cn(className)} {...props} />;
}

interface ItemProps extends React.ComponentPropsWithRef<"li"> {
  selected?: boolean;
  multi?: boolean;
  dimmed?: boolean;
}

function ItemBase({ selected, multi, dimmed, className, ...props }: ItemProps) {
  /* `motion.li` with `layout` FLIPs the card between its old and new
   * bounding box on every commit — so when the sidebar/inspector slide
   * changes the available width, cards glide to their new packed or
   * grid-cell positions instead of teleporting. The packers in
   * `pages/saves-view/waterfall.tsx` and `justified.tsx` freeze their
   * input width during the slide (see `useFrozenValue`), so motion only
   * has to interpolate between two end states rather than every frame.
   *
   * Cast bypasses Motion's `onDrag*` type override: callers pass React's
   * native `onDragStart` (DragEvent), and since we never enable `drag`,
   * motion passes it through to the underlying `<li>` unchanged. */
  return (
    <motion.li
      layout
      transition={drawerSpring}
      className={cn(
        styles.item,
        selected && styles["item-selected"],
        multi && styles["item-multi"],
        dimmed && styles["item-dimmed"],
        className,
      )}
      data-selected={selected ? "true" : undefined}
      data-multi={multi ? "true" : undefined}
      data-dimmed={dimmed ? "true" : undefined}
      {...(props as HTMLMotionProps<"li">)}
    />
  );
}

interface ItemSelectProps extends React.ComponentPropsWithoutRef<"button"> {}

function ItemSelect({ className, type, ...props }: ItemSelectProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(styles.select, className)}
      {...props}
    />
  );
}

interface ItemMediaProps extends React.ComponentPropsWithoutRef<"div"> {}

function ItemMedia({ className, ...props }: ItemMediaProps) {
  return <div className={cn(styles.media, className)} {...props} />;
}

interface ItemMetaProps extends React.ComponentPropsWithoutRef<"div"> {}

function ItemMeta({ className, ...props }: ItemMetaProps) {
  return <div className={cn(styles.meta, className)} {...props} />;
}

interface ItemTitleProps extends React.ComponentPropsWithoutRef<"span"> {}

function ItemTitle({ className, ...props }: ItemTitleProps) {
  return <span className={cn(styles.title, className)} {...props} />;
}

interface ItemTimeProps extends React.ComponentPropsWithoutRef<"span"> {}

function ItemTime({ className, ...props }: ItemTimeProps) {
  return <span className={cn(styles.time, className)} {...props} />;
}

interface ItemCountProps extends React.ComponentPropsWithoutRef<"span"> {}

function ItemCount({ className, role, ...props }: ItemCountProps) {
  return (
    <span
      role={role ?? "status"}
      className={cn(styles.count, className)}
      {...props}
    />
  );
}

interface ItemSourceBadgeProps extends React.ComponentPropsWithoutRef<"span"> {}

function ItemSourceBadge({ className, ...props }: ItemSourceBadgeProps) {
  return (
    <span
      aria-hidden
      className={cn(styles["source-badge"], className)}
      {...props}
    />
  );
}

interface ItemCheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  checked: boolean;
}

function ItemCheckbox({
  checked,
  className,
  type,
  ...props
}: ItemCheckboxProps) {
  return (
    <button
      type={type ?? "button"}
      aria-pressed={checked}
      className={cn(styles.checkbox, className)}
      {...props}
    >
      <span aria-hidden className={styles.checkmark}>
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

const Item = Object.assign(ItemBase, {
  Select: ItemSelect,
  Media: ItemMedia,
  Meta: ItemMeta,
  Title: ItemTitle,
  Time: ItemTime,
  Count: ItemCount,
  SourceBadge: ItemSourceBadge,
  Checkbox: ItemCheckbox,
});

interface EmptyProps extends React.ComponentPropsWithoutRef<"p"> {}

function Empty({ className, ...props }: EmptyProps) {
  return <p className={cn(styles.empty, className)} {...props} />;
}

export const Library = {
  Root,
  Grid,
  List,
  Item,
  Empty,
};

export type { GridLayout, LibraryView };
