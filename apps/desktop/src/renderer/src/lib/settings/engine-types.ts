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
  /** React key, and for field controls the bound key in the section slice. */
  key: string;
  title: string;
  description?: ReactNode;
  /** Extra terms fed to the settings search index (synonyms, values, etc.). */
  keywords?: string[];
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: (values: Record<string, unknown>) => boolean;
  /** Side effect to run after a successful patch (e.g. window.applyPrefs). */
  apply?: () => void;
  /** Binds this single item to a different prefs slice than its group, so one visual group can hold controls from multiple slices. */
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
  /** Extra terms fed to the settings search index. */
  keywords?: string[];
  label: ReactNode;
  /** Defaults to "secondary"; settings rows never use primary or ghost. */
  variant?: "secondary" | "destructive";
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: (values: Record<string, unknown>) => boolean;
  /** Binds this single item to a different prefs slice than its group. */
  prefsKey?: keyof Prefs;
  onClick: () => void;
}

export interface CustomItem {
  control: "custom";
  key: string;
  /** Lets custom rows be indexed and anchored by the settings search even though `render` draws its own markup. */
  title?: string;
  keywords?: string[];
  visible?: (values: Record<string, unknown>) => boolean;
  /** Binds this single item to a different prefs slice than its group. */
  prefsKey?: keyof Prefs;
  render: (binding: Binding) => ReactNode;
}

export type Item = FieldItem | ButtonItem | CustomItem;

export interface GroupConfig {
  title?: ReactNode;
  visible?: (values: Record<string, unknown>) => boolean;
  /** Breaks this group out of the two-column masonry to span the full width. */
  fullWidth?: boolean;
  /** Renders the group as a disclosure to reduce density for advanced/rarely-changed groups; requires a `title`. */
  collapsible?: boolean;
  /** For a collapsible group, start collapsed. */
  defaultCollapsed?: boolean;
  items?: Item[];
  /** Bespoke group body rendered in place of the item list (e.g. usage bar). */
  render?: (binding: Binding) => ReactNode;
  /** Overrides the section binding, letting one section span multiple prefs slices. */
  prefsKey?: keyof Prefs;
  useBinding?: () => Binding;
}

export interface SectionConfig {
  title?: ReactNode;
  description?: ReactNode;
  /** Section-level search terms, useful for bespoke pages whose fields are not declared as items. */
  keywords?: string[];
  width?: "narrow" | "medium" | "wide";
  /** Default binding: usePrefs(prefsKey). */
  prefsKey?: keyof Prefs;
  /** Overrides the binding for non-prefs backends (downloads, etc.). */
  useBinding?: () => Binding;
  groups?: GroupConfig[];
  /** Fully bespoke escape hatch: render this component instead of groups. */
  component?: ComponentType;
}

/**
 * Typed authoring layer: runtime `key` stays loose because bindings resolve through section, group, and item overrides; these helpers catch a field key that would silently no-op.
 * @remarks Custom/button items keep free-form keys on purpose: their `key` is only a React key + search anchor, and they own their binding via `render`/`onClick`.
 */

type Values = Record<string, unknown>;

/** Field-control shape without the key, added per-binding below. */
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

/** A field item whose `key` must name a settable field on the bound slice `V`. */
type TypedFieldItem<V> = FieldMeta &
  FieldControl & { key: Extract<keyof V, string> };

/** Distributes over every prefs slice so the `prefsKey`/`key` pair is always validated together. */
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
  /** Built with the `group` helpers so each group carries its own typed binding. */
  groups: GroupConfig[];
}

/** Section bound to a single prefs slice; every group inherits that binding and each field `key` is checked against the slice. */
export function defineSection<K extends keyof Prefs>(
  prefsKey: K,
  input: TypedSectionInput<Prefs[K]>,
): SectionConfig {
  return { ...input, prefsKey, groups: input.groups as GroupConfig[] };
}

/** Section whose groups each declare their own binding via `group.prefs`, `group.with`, or `group.plain`. */
export function defineCustomSection(input: CustomSectionInput): SectionConfig {
  return input;
}

export const group = {
  /** Group bound to a prefs slice; field `key`s are checked against it, though any item may override via its own `prefsKey`. */
  prefs<K extends keyof Prefs>(
    prefsKey: K,
    input: TypedGroupInput<Prefs[K]>,
  ): GroupConfig {
    return { ...input, prefsKey, items: input.items as Item[] };
  },
  /** Group bound to a custom (non-prefs) binding; field `key`s are checked against the value type inferred from `useBinding`. */
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
  /** Group with no field binding: render-only or static content. */
  plain(input: TypedGroupInput<Values>): GroupConfig {
    return { ...input, items: input.items as Item[] };
  },
};
