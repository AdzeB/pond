import { cn } from "@pond/ui";
import type { ReactNode } from "react";
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

interface EmptyProps extends React.ComponentPropsWithoutRef<"p"> {}

function Empty({ className, ...props }: EmptyProps) {
  return <p className={cn(styles.empty, className)} {...props} />;
}

export const LibraryGrid = {
  Root,
  Grid,
  List,
  Empty,
};

export type { GridLayout };
