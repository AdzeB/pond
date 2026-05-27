import type { ReactNode } from "react";
import type { PathNavigate } from "@/lib/navigate-path";
import type { Save } from "@/pool/types";
import type { PondApi } from "../../../../../preload";

type CommandGroup =
  | "Navigation"
  | "Settings"
  | "Actions"
  | "Sources"
  | "Tags"
  | "Saves"
  | "Save";

export type CommandScope =
  | "all"
  | "saves"
  | "settings"
  | "actions"
  | "sources"
  | "tags";

export interface PaletteCtx {
  navigate: PathNavigate;
  close: () => void;
  pond: PondApi;
  selectedIds: ReadonlyArray<string>;
  focusedSaveId: string | null;
  focusedSave: Save | null;
  // Current route pathname so `when` clauses can scope commands to
  // specific surfaces (e.g. "Empty trash" only when /trash is visible).
  pathname: string;
  // Multi-select count from the selection store; commands branching on
  // bulk-vs-single read this instead of selectedIds.length.
  selectionSize: number;
  setTheme: (theme: "system" | "light" | "dark") => void;
  toast: { success(msg: string): void; warn(msg: string): void };
}

export interface Command {
  id: string;
  label: string;
  description?: string;
  group: CommandGroup;
  scope?: CommandScope;
  keywords?: string[];
  icon?: ReactNode;
  shortcut?: string[];
  chord?: string[];
  when?: (ctx: PaletteCtx) => boolean;
  perform: (ctx: PaletteCtx) => void | Promise<void>;
}

export const SCOPE_LABEL: Record<CommandScope, string> = {
  all: "All",
  saves: "Saves",
  settings: "Settings",
  actions: "Actions",
  sources: "Sources",
  tags: "Tags",
};

export const SCOPE_ORDER: CommandScope[] = [
  "all",
  "saves",
  "settings",
  "actions",
  "sources",
  "tags",
];

export const GROUP_ORDER: CommandGroup[] = [
  "Save",
  "Navigation",
  "Actions",
  "Settings",
  "Sources",
  "Tags",
  "Saves",
];
