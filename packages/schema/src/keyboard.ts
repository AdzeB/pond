export type KeyboardScope = "global" | "app";

export type KeyboardGroup =
  | "general"
  | "navigation"
  | "library"
  | "saving"
  | "view";

export interface KeyboardShortcut {
  id: string;
  group: KeyboardGroup;
  binding: string;
  label: string;
  scope?: KeyboardScope;
}

export const KEYBOARD_GROUP_LABELS: Record<KeyboardGroup, string> = {
  general: "General",
  navigation: "Navigation",
  library: "Library",
  saving: "Saving",
  view: "View",
};

export const KEYBOARD_GROUP_ORDER: readonly KeyboardGroup[] = [
  "general",
  "navigation",
  "library",
  "saving",
  "view",
] as const;

export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = [
  {
    id: "command-palette",
    group: "general",
    binding: "Cmd+K",
    label: "Open command palette",
  },
  {
    id: "preferences",
    group: "general",
    binding: "Cmd+,",
    label: "Open settings",
  },
  {
    id: "cheatsheet",
    group: "general",
    binding: "?",
    label: "Show keyboard shortcuts",
  },
  {
    id: "summon",
    group: "general",
    binding: "Cmd+Shift+L",
    label: "Summon Pond from anywhere",
    scope: "global",
  },
  {
    id: "open-library",
    group: "general",
    binding: "Cmd+Shift+P",
    label: "Open library window",
  },
  {
    id: "new-save",
    group: "saving",
    binding: "Cmd+N",
    label: "New save",
  },
  {
    id: "categorize",
    group: "saving",
    binding: "F",
    label: "Add tags to selection",
  },
  {
    id: "sync-all",
    group: "saving",
    binding: "Cmd+Shift+R",
    label: "Sync all sources",
  },
  {
    id: "reveal-library",
    group: "library",
    binding: "Cmd+Shift+O",
    label: "Reveal library in Finder",
  },
  {
    id: "all-saves",
    group: "navigation",
    binding: "Ctrl+Cmd+1",
    label: "Go to all saves",
  },
  {
    id: "recents",
    group: "navigation",
    binding: "Ctrl+Cmd+2",
    label: "Go to recents",
  },
  {
    id: "random",
    group: "navigation",
    binding: "Ctrl+Cmd+3",
    label: "Go to random",
  },
  {
    id: "untagged",
    group: "navigation",
    binding: "Ctrl+Cmd+4",
    label: "Go to untagged",
  },
  {
    id: "trash",
    group: "navigation",
    binding: "Ctrl+Cmd+5",
    label: "Go to trash",
  },
  {
    id: "toggle-sidebar",
    group: "view",
    binding: "Alt+Cmd+1",
    label: "Toggle sidebar",
  },
  {
    id: "toggle-inspector",
    group: "view",
    binding: "Alt+Cmd+2",
    label: "Toggle inspector",
  },
  {
    id: "cycle-layout",
    group: "view",
    binding: "Cmd+B",
    label: "Cycle layout",
  },
  {
    id: "copy-url",
    group: "saving",
    binding: "Cmd+Shift+,",
    label: "Copy save URL",
  },
  {
    id: "copy-id",
    group: "saving",
    binding: "Cmd+.",
    label: "Copy save ID",
  },
  {
    id: "delete-forever",
    group: "saving",
    binding: "Cmd+Backspace",
    label: "Delete forever",
  },
];
