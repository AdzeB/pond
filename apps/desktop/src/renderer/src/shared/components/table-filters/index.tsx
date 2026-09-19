import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { IconBarsFilterOutline18 } from "@pond/icons/outline/18";
import { Button, Menu, Tooltip } from "@pond/ui";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { AnimateHeight } from "@/shared/components/animate-height";
import { type FilterOption, filterChipLabel } from "./chip-label";
import styles from "./styles.module.css";

export function TableFilterToggle({
  open,
  active,
  controlsId,
  onToggle,
}: {
  open: boolean;
  active?: boolean;
  controlsId: string;
  onToggle: () => void;
}) {
  return (
    <Tooltip label={open ? "Hide Filters" : "Show Filters"} side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        className={styles.toggle}
        data-active={open || active || undefined}
        aria-label="Filter"
        aria-expanded={open}
        aria-controls={controlsId}
        onClick={onToggle}
      >
        <IconBarsFilterOutline18 />
      </Button>
    </Tooltip>
  );
}

export function TableFilterBar({
  open,
  id,
  label,
  children,
}: {
  open: boolean;
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <AnimateHeight key={id} presence initial={false}>
          <fieldset id={id} className={styles.shell} aria-label={label}>
            <div className={styles.bar}>{children}</div>
          </fieldset>
        </AnimateHeight>
      ) : null}
    </AnimatePresence>
  );
}

export function TableFilterChip<T extends string>({
  name,
  icon,
  options,
  selected,
  onChange,
}: {
  name: string;
  icon: ReactNode;
  options: readonly FilterOption<T>[];
  selected: ReadonlySet<T>;
  onChange: (next: Set<T>) => void;
}) {
  const selectedLabels = options
    .filter((option) => selected.has(option.id))
    .map((option) => option.label);
  const active = selected.size > 0;
  const label = filterChipLabel(name, selectedLabels);
  return (
    <div className={styles.chip} data-active={active || undefined}>
      <Menu.Root>
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles.trigger}
          aria-label={label}
          title={label}
        >
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
          <span className={styles.label}>{label}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup className={styles.popup} aria-label={`${name} Filter`}>
              {options.map((option) => (
                <Menu.CheckboxItem
                  key={option.id}
                  closeOnClick={false}
                  checked={selected.has(option.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(selected);
                    if (checked) next.add(option.id);
                    else next.delete(option.id);
                    onChange(next);
                  }}
                >
                  <Menu.CheckboxItemIndicator />
                  <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
                </Menu.CheckboxItem>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active ? (
        <Button
          icon
          size="xs"
          variant="primary"
          className={styles.clear}
          aria-label={`Clear ${name} Filter`}
          onClick={() => onChange(new Set())}
        >
          <IconXmarkOutline12 />
        </Button>
      ) : null}
    </div>
  );
}
