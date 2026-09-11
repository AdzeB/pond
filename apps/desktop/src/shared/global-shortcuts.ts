export const LAYOUT_CYCLE_SHORTCUT = {
  keys: "Mod+Shift+L",
  label: "Cycle Layout",
  group: "View",
} as const;

export const GLOBAL_SHORTCUTS = {
  "app.summon": {
    keys: "Mod+Shift+L",
    label: "Show Pond",
    group: "Global",
  },
  "capture.display": {
    keys: "Mod+Alt+Shift+3",
    label: "Capture Display",
    group: "Global",
  },
  "capture.area": {
    keys: "Mod+Alt+Shift+4",
    label: "Capture Area",
    group: "Global",
  },
  "capture.window": {
    keys: "Mod+Alt+Shift+5",
    label: "Capture Window",
    group: "Global",
  },
} as const;

export type GlobalShortcutId = keyof typeof GLOBAL_SHORTCUTS;

export interface GlobalShortcutStatus {
  enabled: boolean;
  errors: string[];
}
