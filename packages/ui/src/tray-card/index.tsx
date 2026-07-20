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

interface TrayCardProviderProps {
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

function Header({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cn(styles.header, className)} {...props} />;
}

interface TrayCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  position?: "start" | "center";
}

function Title({
  className,
  position = "start",
  ...props
}: TrayCardTitleProps) {
  return (
    <h1
      data-position={position}
      className={cn(styles.title, className)}
      {...props}
    />
  );
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

interface TrayCardActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  position?: "start" | "end";
}

/** Corner circle button; anchors to the enclosing Header, or to the card when there is none. */
function Action({
  className,
  position = "start",
  ...props
}: TrayCardActionProps) {
  return (
    <button
      type="button"
      data-position={position}
      className={cn(styles.action, className)}
      {...props}
    />
  );
}

/** Navigation is the caller's: pass onClick to step back to the previous card. */
function Back(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Action aria-label="Back" {...props}>
      <IconChevronLeftOutline12 strokeWidth={2} />
    </Action>
  );
}

/** Navigation is the caller's: pass onClick to open the card's help view. */
function Help(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Action aria-label="Help" {...props}>
      <IconAlertQuestionFill12 strokeWidth={2} />
    </Action>
  );
}

function Close({ onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { actions } = useTrayCard();
  return (
    <Action
      position="end"
      aria-label="Close"
      /** onClick may preventDefault to take over, for cards that step back instead of dismissing. */
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) actions.dismiss();
      }}
      {...props}
    >
      <IconXmarkOutline12 strokeWidth={2} />
    </Action>
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
