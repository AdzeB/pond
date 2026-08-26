import { useRender } from "@base-ui/react/use-render";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

interface PillProps extends useRender.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
}

function Pill({
  orientation = "horizontal",
  className,
  render,
  ref,
  ...props
}: PillProps) {
  return useRender({
    render,
    ref,
    props: {
      "data-orientation": orientation,
      ...props,
      className: cn(styles.pill, className),
    },
  });
}

function Item({
  className,
  render,
  ref,
  ...props
}: useRender.ComponentProps<"button">) {
  return useRender({
    render,
    ref,
    defaultTagName: "button",
    props: {
      type: render == null ? ("button" as const) : undefined,
      ...props,
      className: cn(styles.item, className),
    },
  });
}

function Indicator({
  className,
  render,
  ref,
  ...props
}: useRender.ComponentProps<"span">) {
  return useRender({
    render,
    ref,
    defaultTagName: "span",
    props: {
      "aria-hidden": true,
      ...props,
      className: cn(styles.indicator, className),
    },
  });
}

function Separator({
  className,
  render,
  ref,
  ...props
}: useRender.ComponentProps<"span">) {
  return useRender({
    render,
    ref,
    defaultTagName: "span",
    props: {
      "aria-hidden": true,
      ...props,
      className: cn(styles.separator, className),
    },
  });
}

export const Tray = {
  Pill,
  Item,
  Indicator,
  Separator,
};
