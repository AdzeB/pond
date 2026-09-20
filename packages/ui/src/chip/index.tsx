import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";
import { Button, type ButtonProps } from "../button";
import { Menu } from "../menu";
import styles from "./styles.module.css";

export type ChipTone = "mention" | "tag" | "applied" | "suggested" | "file";

interface RootProps extends ComponentPropsWithoutRef<"div"> {}

function Root({ className, ...props }: RootProps) {
  return <div className={cn(styles.root, className)} {...props} />;
}

interface ItemProps extends ComponentPropsWithoutRef<"div"> {
  kind?: "field" | "value";
  tone?: ChipTone;
  selected?: boolean;
}

function Item({ className, kind, tone, selected, ...props }: ItemProps) {
  return (
    <div
      className={cn(styles.item, className)}
      data-kind={kind === "value" ? "value" : undefined}
      data-tone={tone}
      data-selected={selected || undefined}
      {...props}
    />
  );
}

interface ActionProps extends ComponentPropsWithoutRef<"button"> {
  tone: Extract<ChipTone, "applied" | "suggested">;
}

function Action({ className, tone, type = "button", ...props }: ActionProps) {
  return (
    <button
      type={type}
      className={cn(styles.action, className)}
      data-tone={tone}
      {...props}
    />
  );
}

interface LinkProps extends ComponentPropsWithoutRef<"a"> {
  tone?: Extract<ChipTone, "file">;
}

function Link({ className, tone = "file", ...props }: LinkProps) {
  return (
    <a className={cn(styles.link, className)} data-tone={tone} {...props} />
  );
}

interface IconProps extends ComponentPropsWithoutRef<"span"> {}

function Icon({ className, ...props }: IconProps) {
  return <span className={cn(styles.icon, className)} aria-hidden {...props} />;
}

interface LabelProps extends ComponentPropsWithoutRef<"span"> {}

function Label({ className, ...props }: LabelProps) {
  return <span className={cn(styles.label, className)} {...props} />;
}

function Operator({
  className,
  size = "xs",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={cn(styles.operator, className)}
      {...props}
    />
  );
}

function Trigger({
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={cn(styles.trigger, className)}
      {...props}
    />
  );
}

function Clear({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      icon
      size="xs"
      variant="ghost"
      className={cn(styles.clear, className)}
      {...props}
    >
      {children ?? <IconXmarkOutline12 />}
    </Button>
  );
}

interface SwatchProps extends ComponentPropsWithoutRef<"span"> {
  color?: string;
}

function Swatch({ color, className, style, ...props }: SwatchProps) {
  return (
    <span
      className={cn(styles.swatch, className)}
      data-spectrum={color ? undefined : ""}
      data-swatch={color}
      style={color ? { ...style, backgroundColor: color } : style}
      aria-hidden
      {...props}
    />
  );
}

interface FilterProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  icon: ReactNode;
  label: ReactNode;
  title?: string;
  active?: boolean;
  ariaLabel: string;
  clearLabel?: string;
  onClear?: () => void;
  onOpenChange?: ComponentProps<typeof Menu.Root>["onOpenChange"];
  children: ReactNode;
}

function Filter({
  icon,
  label,
  title,
  active,
  ariaLabel,
  clearLabel,
  onClear,
  onOpenChange,
  children,
  className,
  ...props
}: FilterProps) {
  return (
    <div className={cn(styles.filter, className)} {...props}>
      <Menu.Root onOpenChange={onOpenChange}>
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles["filter-trigger"]}
          data-active={active || undefined}
          aria-label={ariaLabel}
          title={title ?? ariaLabel}
        >
          <span className={styles["filter-icon"]} aria-hidden>
            {icon}
          </span>
          <span className={styles["filter-label"]}>{label}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            {children}
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active && onClear ? (
        <Button
          icon
          size="xs"
          variant="primary"
          className={styles["filter-clear"]}
          aria-label={clearLabel}
          onClick={onClear}
        >
          <IconXmarkOutline12
            strokeWidth={2}
            className={styles["filter-clear-icon"]}
          />
        </Button>
      ) : null}
    </div>
  );
}

interface PopupProps extends ComponentProps<typeof Menu.Popup> {}

function Popup({ className, ...props }: PopupProps) {
  return <Menu.Popup className={cn(styles.popup, className)} {...props} />;
}

export const Chip = {
  Root,
  Item,
  Action,
  Link,
  Icon,
  Label,
  Operator,
  Trigger,
  Clear,
  Swatch,
  Filter,
  Popup,
};
