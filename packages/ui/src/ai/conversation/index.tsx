import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.root, className)} {...props} />;
}

function Content({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.content, className)} {...props} />;
}

function Empty({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.empty, className)} {...props} />;
}

function ScrollButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(styles["scroll-button"], className)}
      {...props}
    />
  );
}

export const Conversation = { Root, Content, Empty, ScrollButton };
