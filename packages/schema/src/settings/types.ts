// The settings manifest is the single source of truth. Two halves:
//
//   SETTINGS_PREFS     the data model: every prefs slice and field, with
//                      types and defaults. Generates Prefs, DEFAULT_PREFS,
//                      and the zod validator.
//   SETTINGS_SECTIONS  the UI: nav metadata plus the rows shown per section.
//                      Generates nav metadata and the renderer SectionConfig.
//
// Anything non-serializable (icons, custom controls, predicates, side
// effects, bindings) is referenced by name and resolved at runtime through
// a hand-written registry in the desktop app.

export type SettingsGroupId = "app" | "library" | "saving" | "dev";

// ----- Data model (generates Prefs / DEFAULT_PREFS / validator) -----

export type PrefsFieldType =
  | "boolean"
  | "number"
  | "string"
  // A union of string/number literals.
  | { enum: readonly (string | number)[] }
  // A reference to a hand-authored type (imported into the generated file).
  | { ts: string; import?: string };

export interface PrefsFieldSpec {
  type: PrefsFieldType;
  nullable?: boolean;
  // Runtime default value, inlined into DEFAULT_PREFS.
  default: unknown;
  // Optional bounds for the generated zod validator (numbers only).
  min?: number;
  max?: number;
}

export type SlicePrefsSpec =
  | { kind: "fields"; fields: Record<string, PrefsFieldSpec> }
  // A whole slice backed by a hand-authored type and default constant.
  | { kind: "ref"; ts: string; import?: string; default: unknown };

export type PrefsManifest = Record<string, SlicePrefsSpec>;

// ----- UI model (generates nav + SectionConfig) -----

export type ControlKind =
  | "switch"
  | "select"
  | "range"
  | "stepper"
  | "number"
  | "color";

export interface SelectOptionSpec {
  value: string | number | boolean | null;
  label: string;
}

interface RowBase {
  key: string;
  title?: string;
  description?: string;
  visible?: string;
  disabled?: string;
  apply?: string;
}

export type FieldRow = RowBase & {
  control: ControlKind;
  options?: SelectOptionSpec[];
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  unit?: string;
  fallback?: number;
  placeholder?: string;
};

export interface CustomRow {
  control: "custom";
  key: string;
  component: string;
  visible?: string;
}

export type Row = FieldRow | CustomRow;

export interface GroupSpec {
  title?: string;
  // Prefs slice bound to this group (overrides the section slice).
  slice?: string;
  // Named custom binding (e.g. downloads), resolved in the runtime registry.
  binding?: string;
  visible?: string;
  items?: Row[];
  // Bespoke group body component name, rendered in place of an item list.
  body?: string;
}

export interface SectionSpec {
  id: string;
  label: string;
  group: SettingsGroupId;
  icon: string;
  description?: string;
  // Default prefs slice for declarative groups in this section.
  slice?: string;
  groups?: GroupSpec[];
  // Fully bespoke section: render this component instead of groups.
  custom?: string;
}

export type SectionsManifest = readonly SectionSpec[];
