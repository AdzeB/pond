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

function Back(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Action aria-label="Back" {...props}>
      <IconChevronLeftOutline12 strokeWidth={2} />
    </Action>
  );
}

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
  size: "lg",
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
      className={cn(styles.button, className)}
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
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) actions.dismiss();
      }}
      {...CommonButtonProps}
      {...props}
      className={cn(styles.button, className)}
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
