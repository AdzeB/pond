import { clsx as cn } from "clsx";
import { type ReactNode, useLayoutEffect } from "react";
import styles from "./styles.module.css";

interface RootProps {
  header: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Shell chrome lives on `#root`; this only mounts the header + main. */
function Root({ header, children, className }: RootProps) {
  useLayoutEffect(() => {
    const el = document.getElementById("root");
    if (!el) return;
    const shell = styles.root;
    if (!shell) return;
    const extra = className?.split(/\s+/).filter(Boolean) ?? [];
    el.classList.add(shell, ...extra);
    return () => {
      el.classList.remove(shell, ...extra);
    };
  }, [className]);

  return (
    <>
      <div className={styles.header}>{header}</div>
      <div className={styles.main}>{children}</div>
    </>
  );
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

/** Nav + omnibox row inside main. */
function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={cn(styles.toolbar, className)} {...props} />;
}

interface ContentProps extends React.ComponentPropsWithoutRef<"div"> {}

function Content({ className, ...props }: ContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export const AppShell = { Root, Toolbar, Content };
