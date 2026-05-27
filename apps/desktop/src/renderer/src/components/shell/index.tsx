import { cn } from "@pond/ui";
import type React from "react";
import type { ReactNode } from "react";
import { usePlatform } from "@/lib/platform";
import styles from "./styles.module.css";

interface ShellProps {
  sidebar?: ReactNode;
  inspector?: ReactNode;
  children: ReactNode;
}

function ShellLayout({ sidebar, inspector, children }: ShellProps) {
  const platform = usePlatform();
  return (
    <div className={styles.shell} data-platform={platform}>
      <div aria-hidden className={styles["drag-strip"]} />
      {sidebar}
      {children}
      {inspector}
    </div>
  );
}

interface MainProps extends React.ComponentProps<"main"> {}

function Main({ className, ...props }: MainProps) {
  return <main className={cn(styles.main, className)} {...props} />;
}

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {}

function Header({ className, ...props }: HeaderProps) {
  return <div className={cn(styles.header, className)} {...props} />;
}

interface EmptyProps extends React.ComponentPropsWithoutRef<"p"> {
  children?: ReactNode;
}

function Empty({ className, ...props }: EmptyProps) {
  return <p className={cn(styles.empty, className)} {...props} />;
}

export const Shell = Object.assign(ShellLayout, { Main, Header, Empty });
