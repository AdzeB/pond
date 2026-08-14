import { clsx as cn } from "clsx";
import { type ComponentProps, forwardRef } from "react";
import { Button, type ButtonProps } from "../../button";
import styles from "./styles.module.css";

const Root = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  function PromptInputRoot({ className, ...props }, ref) {
    return <div ref={ref} className={cn(styles.root, className)} {...props} />;
  },
);

function Body({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.body, className)} {...props} />;
}

function Toolbar({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.toolbar, className)} {...props} />;
}

function ToolbarGroup({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.group, className)} {...props} />;
}

function Submit({
  className,
  variant = "primary",
  size = "xs",
  icon = true,
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      className={cn(styles.submit, className)}
      {...props}
    />
  );
}

export const PromptInput = {
  Root,
  Body,
  Toolbar,
  ToolbarGroup,
  Submit,
};
