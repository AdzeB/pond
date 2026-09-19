import { cn } from "@pond/ui";
import type { ReactNode } from "react";
import type { LibraryCardView } from "@/features/saves/components/card/types";
import styles from "./styles.module.css";

type GridLayout = LibraryCardView;

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
}

function Root({ className, style, children, ...props }: RootProps) {
  return (
    <div className={cn(styles.root, className)} style={style} {...props}>
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
        : layout === "list"
          ? styles["grid-list"]
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

export const LibraryGrid = {
  Root,
  Grid,
};

export type { GridLayout };
