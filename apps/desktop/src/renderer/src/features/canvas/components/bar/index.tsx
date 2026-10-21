import { Button, cssVars, Keyboard, Tooltip } from "@pond/ui";
import { CANVAS_COLORS, type CanvasColor } from "@shared/canvas-contracts";
import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { platformGlyphs } from "@/shared/lib/shortcuts";
import { CANVAS_COLOR_LABELS, INK } from "../../lib/colors";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"div"> {
  hidden?: boolean;
}

function Root({ hidden, className, ...props }: RootProps) {
  return (
    <Tooltip.Group>
      <div
        className={cn(styles.bar, className)}
        data-hidden={hidden || undefined}
        {...props}
      />
    </Tooltip.Group>
  );
}

interface GroupProps extends ComponentPropsWithoutRef<"fieldset"> {}

function Group({ className, ...props }: GroupProps) {
  return <fieldset className={cn(styles.group, className)} {...props} />;
}

interface ColorsProps {
  value: CanvasColor | null;
  onChange(color: CanvasColor): void;
}

function Colors({ value, onChange }: ColorsProps) {
  return (
    <Group aria-label="Color">
      {CANVAS_COLORS.map((swatch) => (
        <Tooltip key={swatch} label={CANVAS_COLOR_LABELS[swatch]} side="top">
          <Button
            icon
            size="xs"
            variant="text"
            aria-label={CANVAS_COLOR_LABELS[swatch]}
            aria-pressed={value === swatch}
            data-pressed={value === swatch || undefined}
            onClick={() => onChange(swatch)}
          >
            <span
              className={styles.swatch}
              style={cssVars({ "--swatch": INK[swatch] })}
            />
          </Button>
        </Tooltip>
      ))}
    </Group>
  );
}

interface ActionProps {
  label: string;
  shortcut?: string[];
  pressed?: boolean;
  onClick(): void;
  children: ReactElement;
}

function Action({ label, shortcut, pressed, onClick, children }: ActionProps) {
  return (
    <Tooltip
      label={label}
      shortcut={
        shortcut ? (
          <Keyboard.Cluster keys={platformGlyphs(shortcut)} />
        ) : undefined
      }
      side="top"
    >
      <Button
        icon
        size="xs"
        variant="ghost"
        aria-label={label}
        aria-pressed={pressed}
        data-pressed={pressed || undefined}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export const Bar = { Root, Group, Colors, Action };
