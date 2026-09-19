import type { ComponentType, ReactNode } from "react";
import type { ShortcutId } from "@/shared/lib/shortcuts";

export type CommandIcon = ComponentType<{ "aria-hidden"?: boolean }>;

export interface CommandSpec {
  id: string;
  group: "Create" | "Import" | "Navigate" | "App";
  label: string;
  detail?: string;
  icon: CommandIcon;
  keywords: string;
  shortcut?: ShortcutId;
  run: () => void;
}

export interface MenuEntry {
  id: string;
  group: string;
  label: string;
  detail?: string;
  icon: ReactNode;
  shortcut?: ShortcutId;
  run: () => void;
}

export interface MenuGroup {
  group: string;
  entries: MenuEntry[];
}
