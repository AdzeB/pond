import { Tabs as Base } from "@base-ui/react/tabs";
import { clsx as cn } from "clsx";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

export interface TabsItem {
  value: string;
  label: ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: readonly TabsItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Pill indicator on a recessed track. */
  variant?: "segmented";
  size?: "sm" | "md";
  activateOnFocus?: boolean;
  className?: string;
  listClassName?: string;
  "aria-label"?: string;
}

function Root({
  className,
  size = "md",
  variant = "segmented",
  ...props
}: Base.Root.Props & {
  size?: "sm" | "md";
  variant?: "segmented";
}) {
  return (
    <Base.Root
      data-size={size}
      data-variant={variant}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}

function List({ className, ...props }: Base.List.Props) {
  return <Base.List className={cn(styles.list, className)} {...props} />;
}

function Tab({ className, ...props }: Base.Tab.Props) {
  return <Base.Tab className={cn(styles.tab, className)} {...props} />;
}

function Indicator({ className, ...props }: Base.Indicator.Props) {
  return (
    <Base.Indicator className={cn(styles.indicator, className)} {...props} />
  );
}

function Panel({ className, ...props }: Base.Panel.Props) {
  return <Base.Panel className={cn(styles.panel, className)} {...props} />;
}

/** Segmented tab list with a sliding active indicator. */
function TabsRoot({
  tabs,
  value,
  defaultValue,
  onValueChange,
  variant = "segmented",
  size = "md",
  activateOnFocus = true,
  className,
  listClassName,
  "aria-label": ariaLabel,
}: TabsProps) {
  if (tabs.length === 0) return null;

  const controlled = value !== undefined;

  return (
    <Root
      size={size}
      variant={variant}
      className={className}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : (defaultValue ?? tabs[0]?.value)}
      onValueChange={(next) => {
        onValueChange?.(String(next));
      }}
    >
      <List
        activateOnFocus={activateOnFocus}
        aria-label={ariaLabel}
        className={listClassName}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={tab.className}
          >
            {tab.label}
          </Tab>
        ))}
        <Indicator />
      </List>
    </Root>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  Root,
  List,
  Tab,
  Indicator,
  Panel,
});
