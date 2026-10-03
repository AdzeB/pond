export const LAYOUT_CYCLE_SHORTCUT = {
  keys: "Mod+Shift+L",
  label: "Cycle Layout",
  group: "View",
} as const;

const SCREENSHOT_SHORTCUTS = {
  "capture.area": { keys: "Mod+Alt+E", label: "Capture Area", group: "Global" },
  "capture.window": {
    keys: undefined,
    label: "Capture Window",
    group: "Global",
  },
  "capture.screen": {
    keys: undefined,
    label: "Capture Full Screen",
    group: "Global",
  },
} as const;

export const GLOBAL_SHORTCUTS = {
  ...SCREENSHOT_SHORTCUTS,
  "app.summon": {
    keys: "Mod+Shift+L",
    label: "Show Pond",
    group: "Global",
  },
} as const;

export type GlobalShortcutId = keyof typeof GLOBAL_SHORTCUTS;

export interface GlobalShortcutStatus {
  enabled: boolean;
  errors: string[];
}
