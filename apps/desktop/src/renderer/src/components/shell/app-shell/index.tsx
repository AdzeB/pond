import { cn, Window } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

interface RootProps {
  header: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}

function Root({ header, children, right, className }: RootProps) {
  return (
    <Window.Root className={className}>
      <Window.Top>{header}</Window.Top>
      <Window.Center>{children}</Window.Center>
      <Window.Right open={Boolean(right)}>{right}</Window.Right>
    </Window.Root>
  );
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={cn(styles.toolbar, className)} {...props} />;
}

interface ContentProps extends React.ComponentPropsWithoutRef<"div"> {}

function Content({ className, ...props }: ContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export const AppShell = { Root, Toolbar, Content };
