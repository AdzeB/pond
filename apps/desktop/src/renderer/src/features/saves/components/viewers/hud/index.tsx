import {
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
} from "@pond/icons/outline/18";
import { Button, Tooltip, Tray } from "@pond/ui";
import { clsx as cn } from "clsx";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  use,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import styles from "./styles.module.css";

export type ViewerHudAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface SlidePager {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}

const HudTooltipSide = createContext<"top" | "bottom">("top");
const HudOverlayContext = createContext<HTMLElement | null>(null);
const SlidePagerContext = createContext<SlidePager | null>(null);

export function HudHost({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  return (
    <HudOverlayContext value={overlay}>
      <div className={styles.host}>
        {children}
        <div className={styles.layer} ref={setOverlay} />
      </div>
    </HudOverlayContext>
  );
}

export function SlidePagerProvider({
  value,
  children,
}: {
  value: SlidePager;
  children: ReactNode;
}) {
  return <SlidePagerContext value={value}>{children}</SlidePagerContext>;
}

export function useSlidePager(): SlidePager | null {
  return use(SlidePagerContext);
}

function Root({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const overlay = use(HudOverlayContext);
  const hud = <div className={cn(styles.hud, className)} {...props} />;
  if (overlay) return createPortal(hud, overlay);
  return hud;
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

function Pager({ index, count, onPrev, onNext }: SlidePager) {
  return (
    <Pill role="toolbar" aria-label="Slides">
      <Tool
        label="Previous Slide"
        shortcut={<ShortcutKeys id="viewer.prev-slide" />}
        disabled={index <= 0}
        onClick={onPrev}
      >
        <IconArrowLeftOutline18 />
      </Tool>
      <Scale>
        {index + 1} / {count}
      </Scale>
      <Tool
        label="Next Slide"
        shortcut={<ShortcutKeys id="viewer.next-slide" />}
        disabled={index >= count - 1}
        onClick={onNext}
      >
        <IconArrowRightOutline18 />
      </Tool>
    </Pill>
  );
}

export const ViewerHud = {
  Root,
  Cluster,
  Pill,
  Scale,
  Tool,
  Pager,
};
