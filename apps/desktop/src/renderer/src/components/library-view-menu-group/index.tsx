import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button, type ButtonProps, cn } from "@pond/ui";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import styles from "./styles.module.css";

function Root({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.root, className)} {...props} />;
}

function Header({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cn(styles.header, className)} {...props} />;
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

function Close({
  className,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const dock = useDock();
  return (
    <button
      type="button"
      aria-label="Close"
      className={cn(styles.close, className)}
      onClick={(e) => {
        onClick?.(e);
        dock.closeViewMenu();
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
  const dock = useDock();
  return (
    <Button
      variant="tertiary"
      onClick={(e) => {
        onClick?.(e);
        dock.closeViewMenu();
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
  const dock = useDock();
  return (
    <Button
      variant="accent"
      /** onClick may preventDefault to keep the card open, for async submits that close themselves on success. */
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) dock.closeViewMenu();
      }}
      {...CommonButtonProps}
      {...props}
    >
      {children ?? "Confirm"}
    </Button>
  );
}

export const Dock = {
  Root,
  Header,
  Title,
  Description,
  Separator,
  Footer,
  Close,
  Cancel,
  Confirm,
};
