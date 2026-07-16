import { IconAlertQuestionFill12 } from "@pond/icons/fill/12";
import {
  IconChevronLeftOutline12,
  IconXmarkOutline12,
} from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
} from "react";
import { Button, type ButtonProps } from "../button";
import { TrayCardContext, useTrayCard } from "./context";
import styles from "./styles.module.css";

export interface TrayCardProviderProps {
  onDismiss: () => void;
  children: ReactNode;
}

/** Injects the dismiss action once so cards stay decoupled from whoever owns the tray's state. */
function Provider({ onDismiss, children }: TrayCardProviderProps) {
  const value = useMemo(
    () => ({ actions: { dismiss: onDismiss } }),
    [onDismiss],
  );
  return <TrayCardContext value={value}>{children}</TrayCardContext>;
}

function Root({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.root, className)} {...props} />;
}

export interface TrayCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  position?: "start" | "center";
}

function Header({
  className,
  position = "start",
  ...props
}: TrayCardHeaderProps) {
  return (
    <header
      data-position={position}
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

function Title({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn(styles.title, className)} {...props} />;
}

function Description({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(styles.description, className)} {...props} />;
}

function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.separator, className)} {...props} />;
}

function Footer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.footer, className)} {...props} />;
}

/** Navigation is the caller's: pass onClick to step back to the previous card. */
function Back({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Back"
      className={cn(styles.back, className)}
      {...props}
    >
      <IconChevronLeftOutline12 strokeWidth={2} />
    </button>
  );
}

/** Navigation is the caller's: pass onClick to open the card's help view. */
function Help({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Help"
      className={cn(styles.help, className)}
      {...props}
    >
      <IconAlertQuestionFill12 strokeWidth={2} />
    </button>
  );
}

interface ActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  position?: "start" | "end";
}

function Action({
  className,
  onClick,
  children,
  position = "start",
  ...props
}: ActionProps) {
  return (
    <button
      type="button"
      className={cn(styles.action, className)}
      data-position={position}
      {...props}
      onClick={(e) => {
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

function Close({
  className,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { actions } = useTrayCard();
  return (
    <button
      type="button"
      aria-label="Close"
      className={cn(styles.close, className)}
      onClick={(e) => {
        onClick?.(e);
        actions.dismiss();
      }}
      {...props}
    >
      <IconXmarkOutline12 strokeWidth={2} />
    </button>
  );
}

const CommonButtonProps: ButtonProps = {
  size: "lg" as const,
  className: styles.button,
  style: {
    width: "100%",
  },
};

function Cancel({
  className,
  onClick,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { actions } = useTrayCard();
  return (
    <Button
      variant="tertiary"
      onClick={(e) => {
        onClick?.(e);
        actions.dismiss();
      }}
      {...CommonButtonProps}
      {...props}
    >
      {children ?? "Cancel"}
    </Button>
  );
}

function Confirm({
  className,
  onClick,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { actions } = useTrayCard();
  return (
    <Button
      variant="accent"
      /** onClick may preventDefault to keep the card open, for async submits that close themselves on success. */
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) actions.dismiss();
      }}
      {...CommonButtonProps}
      {...props}
    >
      {children ?? "Confirm"}
    </Button>
  );
}

export const TrayCard = {
  Provider,
  Root,
  Header,
  Title,
  Description,
  Separator,
  Footer,
  Back,
  Close,
  Help,
  Action,
  Cancel,
  Confirm,
};
