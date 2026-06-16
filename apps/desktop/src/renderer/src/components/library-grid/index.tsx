import { cn } from "@pond/ui";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { styles } from "./styles";

type LibraryView = "grid" | "list";
type GridLayout = "waterfall" | "grid" | "justified";

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {
  view: LibraryView;
  children: ReactNode;
}

function Root({ view, className, style, children, ...props }: RootProps) {
  const sx = stylex.props(styles.root);
  return (
    <div
      data-view={view}
      className={cn(sx.className, className)}
      style={{ ...sx.style, ...style }}
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
  style,
  ...props
}: GridProps) {
  const sx = stylex.props(styles.grid);
  return (
    <ul
      className={cn(sx.className, className)}
      style={{ ...sx.style, ...style }}
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

function Empty({ className, style, ...props }: EmptyProps) {
  const sx = stylex.props(styles.empty);
  return (
    <p
      className={cn(sx.className, className)}
      style={{ ...sx.style, ...style }}
      {...props}
    />
  );
}

export const LibraryGrid = {
  Root,
  Grid,
  List,
  Empty,
};

export type { GridLayout };
