import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button, type ButtonProps } from "../../button";
import styles from "./styles.module.css";

type MessageRootProps = ComponentProps<"div"> & {
  from: "user" | "assistant";
};

function Root({ className, from, ...props }: MessageRootProps) {
  return (
    <div className={cn(styles.root, className)} data-from={from} {...props} />
  );
}

function Content({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.content, className)} {...props} />;
}

function Response({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.response, className)} {...props} />;
}

function Actions({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.actions, className)} {...props} />;
}

function Action({
  className,
  variant = "ghost",
  size = "xs",
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(styles.action, className)}
      {...props}
    />
  );
}

export const Message = { Root, Content, Response, Actions, Action };
