import { cn } from "@pond/ui";
import { type HTMLMotionProps, motion } from "motion/react";
import type { ReactNode } from "react";
import { drawerSpring } from "@/lib/motion";
import styles from "./styles.module.css";

type LibraryView = "grid" | "list";
type GridLayout = "waterfall" | "grid" | "justified";

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {
  view: LibraryView;
  children: ReactNode;
}

function Root({ view, className, style, children, ...props }: RootProps) {
  return (
    <div
      data-view={view}
      className={cn(styles.root, className)}
      style={style}
      {...props}
    >
      {children}
    </div>
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
      className={cn(styles.grid, layoutClass, className)}
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
  return (
    <motion.li
      layout="position"
      transition={drawerSpring}
      className={cn(styles.item, className)}
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

interface ItemNoteProps extends React.ComponentPropsWithoutRef<"span"> {}

function ItemNote({ className, ...props }: ItemNoteProps) {
  return <span className={cn(styles.note, className)} {...props} />;
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
  Note: ItemNote,
  Checkbox: ItemCheckbox,
});

interface EmptyProps extends React.ComponentPropsWithoutRef<"p"> {}

function Empty({ className, ...props }: EmptyProps) {
  return <p className={cn(styles.empty, className)} {...props} />;
}

export const LibraryGrid = {
  Root,
  Grid,
  List,
  Item,
  Empty,
};

export type { GridLayout, LibraryView };
