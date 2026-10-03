import { clsx as cn } from "clsx";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";
import { Button } from "../button";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"form"> {
  onSend?: () => void;
}

function Root({ className, onSend, onSubmit, ...props }: RootProps) {
  return (
    <form
      className={cn(styles.composer, className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
        onSend?.();
      }}
      {...props}
    />
  );
}

const Input = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function Input({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(styles.input, className)}
      {...props}
    />
  );
});

function Send({ children, ...props }: ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button type="submit" icon variant="secondary" size="sm" {...props}>
      {children}
    </Button>
  );
}

function Stop({ children, ...props }: ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button type="button" icon size="sm" variant="secondary" {...props}>
      {children}
    </Button>
  );
}

function Toolbar({ children }: { children?: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

function Actions({ children }: { children?: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export const Composer = { Root, Input, Send, Stop, Toolbar, Actions };
