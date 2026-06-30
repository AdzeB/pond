import type { Prefs } from "@pond/schema/db";
import type { ComponentType, ReactNode } from "react";

export interface Binding<V = Record<string, unknown>> {
  values: V;
  patch: (delta: Partial<V>) => void;
  loaded: boolean;
}

export interface SelectOption {
  value: string | number | boolean | null;
  label: ReactNode;
}

interface ItemBase {
  // React key, and for field controls the bound key in the section slice.
  key: string;
  title: string;
  description?: ReactNode;
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: (values: Record<string, unknown>) => boolean;
  // Side effect to run after a successful patch (e.g. window.applyPrefs).
  apply?: () => void;
}

export type FieldItem = ItemBase &
  (
    | { control: "switch" }
    | { control: "select"; options: SelectOption[]; placeholder?: ReactNode }
    | {
        control: "range";
        min: number;
        max: number;
        step?: number;
        suffix?: string;
      }
    | {
        control: "stepper";
        min: number;
        max: number;
        step?: number;
        fallback?: number;
      }
    | {
        control: "number";
        min: number;
        max: number;
        unit?: string;
        width?: number;
      }
    | { control: "color" }
  );

export interface ButtonItem {
  control: "button";
  key: string;
  title: string;
  description?: ReactNode;
  label: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  size?: "xs" | "sm";
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: (values: Record<string, unknown>) => boolean;
  onClick: () => void;
}

export interface CustomItem {
  control: "custom";
  key: string;
  visible?: (values: Record<string, unknown>) => boolean;
  render: (binding: Binding) => ReactNode;
}

export type Item = FieldItem | ButtonItem | CustomItem;

export interface GroupConfig {
  title?: ReactNode;
  visible?: (values: Record<string, unknown>) => boolean;
  // Break this group out of the two-column masonry to span the full width.
  fullWidth?: boolean;
  items?: Item[];
  // Bespoke group body rendered in place of the item list (e.g. usage bar).
  render?: (binding: Binding) => ReactNode;
  // Override the section binding (lets one section span multiple prefs slices).
  prefsKey?: keyof Prefs;
  useBinding?: () => Binding;
}

export interface SectionConfig {
  title?: ReactNode;
  description?: ReactNode;
  width?: "narrow" | "medium" | "wide";
  // Default binding: usePrefs(prefsKey).
  prefsKey?: keyof Prefs;
  // Override the binding for non-prefs backends (downloads, etc.).
  useBinding?: () => Binding;
  groups?: GroupConfig[];
  // Fully bespoke escape hatch: render this component instead of groups.
  component?: ComponentType;
}
