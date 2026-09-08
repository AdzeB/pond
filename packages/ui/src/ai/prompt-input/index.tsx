import { clsx as cn } from "clsx";
import {
  type ComponentProps,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { Button, type ButtonProps } from "../../button";
import styles from "./styles.module.css";

const Root = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  function PromptInputRoot({ className, ...props }, ref) {
    return <div ref={ref} className={cn(styles.root, className)} {...props} />;
  },
);

function Input({
  ref,
  value,
  onKeyDown,
  className,
  ...props
}: ComponentProps<"textarea">) {
  const input = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => {
    if (!input.current) throw new Error("Prompt input is not mounted");
    return input.current;
  }, []);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element || value == null) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      {...props}
      className={cn(styles.input, className)}
      ref={input}
      value={value}
      rows={2}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          event.key !== "Enter" ||
          event.shiftKey ||
          event.nativeEvent.isComposing ||
          event.keyCode === 229
        )
          return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

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
  Input,
  Toolbar,
  ToolbarGroup,
  Submit,
};
