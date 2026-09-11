import { Button, Tooltip, Tray } from "@pond/ui";
import { clsx as cn } from "clsx";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  use,
} from "react";
import styles from "./styles.module.css";

export type ViewerHudAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

const HudTooltipSide = createContext<"top" | "bottom">("top");

function Root({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.hud, className)} {...props} />;
}

function Cluster({
  anchor,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { anchor: ViewerHudAnchor }) {
  const side = anchor.startsWith("top") ? "bottom" : "top";
  return (
    <HudTooltipSide value={side}>
      <div
        className={cn(styles.cluster, className)}
        data-anchor={anchor}
        {...props}
      >
        {children}
      </div>
    </HudTooltipSide>
  );
}

function Pill({ className, ...props }: ComponentProps<typeof Tray.Pill>) {
  return <Tray.Pill className={cn(styles.pill, className)} {...props} />;
}

function Scale({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(styles.scale, className)} {...props} />;
}

function Tool({
  className,
  icon = true,
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  className?: string;
  icon?: boolean;
  label: string;
  shortcut?: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const side = use(HudTooltipSide);
  return (
    <Tooltip label={label} shortcut={shortcut} side={side}>
      <Button
        className={className}
        icon={icon}
        size="md"
        variant="ghost"
        aria-label={label}
        aria-pressed={pressed || undefined}
        data-pressed={pressed || undefined}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export const ViewerHud = {
  Root,
  Cluster,
  Pill,
  Scale,
  Tool,
};
