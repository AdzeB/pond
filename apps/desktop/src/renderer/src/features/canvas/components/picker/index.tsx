import { IconFigures } from "@pond/icons";
import { Button, cssVars, Popover, Tooltip } from "@pond/ui";
import {
  CANVAS_COLORS,
  type CanvasColor,
  type CanvasOutline,
} from "@shared/canvas-contracts";
import { type ReactElement, useState } from "react";
import { CANVAS_COLOR_LABELS, SWATCH } from "../../lib/colors";
import { OUTLINES } from "../../lib/outlines";
import styles from "./styles.module.css";

export interface PickerOption<Value extends string> {
  value: Value;
  label: string;
  icon: ReactElement;
}

interface RootProps<Value extends string> {
  label: string;
  value: Value | null;
  options: readonly PickerOption<Value>[];
  columns: number;
  size: "xs" | "sm";
  /** Shown on the trigger when the selection mixes values. */
  fallback: ReactElement;
  onChange(value: Value): void;
}

/** One button for the current value; the full set opens as a grid so the bar stays short. */
function Root<Value extends string>({
  label,
  value,
  options,
  columns,
  size,
  fallback,
  onChange,
}: RootProps<Value>) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip label={label} side="top">
        <Popover.Trigger
          render={
            <Button
              icon
              size={size}
              variant="ghost"
              aria-label={label}
              data-pressed={open || undefined}
            />
          }
        >
          {current?.icon ?? fallback}
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={10}>
          <Popover.Popup
            aria-label={label}
            style={cssVars({
              "--ds-popup-width": "max-content",
              "--ds-popup-min-width": "0px",
              "--popup-padding-block": "4px",
            })}
          >
            <div
              className={styles.grid}
              style={cssVars({ "--picker-columns": `${columns}` })}
            >
              {options.map((option) => (
                <Tooltip key={option.value} label={option.label} side="top">
                  <Button
                    icon
                    size={size}
                    variant="ghost"
                    aria-label={option.label}
                    aria-pressed={option.value === value}
                    data-pressed={option.value === value || undefined}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.icon}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface SwatchProps {
  color: CanvasColor | null;
}

function Swatch({ color }: SwatchProps) {
  return (
    <span
      className={styles.swatch}
      data-mixed={color ? undefined : true}
      style={color ? cssVars({ "--swatch": SWATCH[color] }) : undefined}
    />
  );
}

const COLOR_OPTIONS: readonly PickerOption<CanvasColor>[] = CANVAS_COLORS.map(
  (color) => ({
    value: color,
    label: CANVAS_COLOR_LABELS[color],
    icon: <Swatch color={color} />,
  }),
);

interface ColorsProps {
  value: CanvasColor | null;
  size: "xs" | "sm";
  onChange(color: CanvasColor): void;
}

function Colors({ value, size, onChange }: ColorsProps) {
  return (
    <Root
      label="Color"
      value={value}
      options={COLOR_OPTIONS}
      columns={5}
      size={size}
      fallback={<Swatch color={null} />}
      onChange={onChange}
    />
  );
}

const OUTLINE_OPTIONS: readonly PickerOption<CanvasOutline>[] = OUTLINES.map(
  ({ outline, label, Icon }) => ({ value: outline, label, icon: <Icon /> }),
);

interface OutlinesProps {
  value: CanvasOutline | null;
  size: "xs" | "sm";
  onChange(outline: CanvasOutline): void;
}

function Outlines({ value, size, onChange }: OutlinesProps) {
  return (
    <Root
      label="Shape"
      value={value}
      options={OUTLINE_OPTIONS}
      columns={5}
      size={size}
      fallback={<IconFigures />}
      onChange={onChange}
    />
  );
}

export const Picker = { Root, Colors, Outlines, Swatch };
