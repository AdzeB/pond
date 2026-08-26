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
  key: string;
  title: string;
  description?: ReactNode;
  keywords?: string[];
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: (values: Record<string, unknown>) => boolean;
  apply?: () => void;
  prefsKey?: keyof Prefs;
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
  keywords?: string[];
  label: ReactNode;
  variant?: "secondary" | "destructive";
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: (values: Record<string, unknown>) => boolean;
  prefsKey?: keyof Prefs;
  onClick: () => void;
}

export interface CustomItem {
  control: "custom";
  key: string;
  title?: string;
  keywords?: string[];
  visible?: (values: Record<string, unknown>) => boolean;
  prefsKey?: keyof Prefs;
  render: (binding: Binding) => ReactNode;
}

export type Item = FieldItem | ButtonItem | CustomItem;

export interface GroupConfig {
  title?: ReactNode;
  visible?: (values: Record<string, unknown>) => boolean;
  fullWidth?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items?: Item[];
  render?: (binding: Binding) => ReactNode;
  prefsKey?: keyof Prefs;
  useBinding?: () => Binding;
}

export interface SectionConfig {
  title?: ReactNode;
  description?: ReactNode;
  keywords?: string[];
  width?: "narrow" | "medium" | "wide";
  prefsKey?: keyof Prefs;
  useBinding?: () => Binding;
  groups?: GroupConfig[];
  component?: ComponentType;
}

type Values = Record<string, unknown>;

type FieldControl =
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
  | { control: "color" };

interface FieldMeta {
  title: string;
  description?: ReactNode;
  keywords?: string[];
  visible?: (values: Values) => boolean;
  disabled?: (values: Values) => boolean;
  apply?: () => void;
}

type TypedFieldItem<V> = FieldMeta &
  FieldControl & { key: Extract<keyof V, string> };

type OverrideFieldItem = {
  [K in keyof Prefs]: TypedFieldItem<Prefs[K]> & { prefsKey: K };
}[keyof Prefs];

type TypedItem<V> =
  | TypedFieldItem<V>
  | OverrideFieldItem
  | ButtonItem
  | CustomItem;

interface TypedGroupInput<V> {
  title?: ReactNode;
  visible?: (values: Values) => boolean;
  fullWidth?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items?: TypedItem<V>[];
  render?: (binding: Binding) => ReactNode;
}

interface TypedSectionInput<V> {
  title?: ReactNode;
  description?: ReactNode;
  keywords?: string[];
  width?: SectionConfig["width"];
  groups: TypedGroupInput<V>[];
}

interface CustomSectionInput {
  title?: ReactNode;
  description?: ReactNode;
  keywords?: string[];
  width?: SectionConfig["width"];
  groups: GroupConfig[];
}

export function defineSection<K extends keyof Prefs>(
  prefsKey: K,
  input: TypedSectionInput<Prefs[K]>,
): SectionConfig {
  return { ...input, prefsKey, groups: input.groups as GroupConfig[] };
}

export function defineCustomSection(input: CustomSectionInput): SectionConfig {
  return input;
}

export const group = {
  prefs<K extends keyof Prefs>(
    prefsKey: K,
    input: TypedGroupInput<Prefs[K]>,
  ): GroupConfig {
    return { ...input, prefsKey, items: input.items as Item[] };
  },
  with<V>(
    useBinding: () => Binding<V>,
    input: TypedGroupInput<V>,
  ): GroupConfig {
    return {
      ...input,
      useBinding: useBinding as unknown as () => Binding,
      items: input.items as Item[],
    };
  },
  plain(input: TypedGroupInput<Values>): GroupConfig {
    return { ...input, items: input.items as Item[] };
  },
};
