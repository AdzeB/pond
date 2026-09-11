import {
  type Hotkey,
  normalizeHotkey,
  validateHotkey,
} from "@tanstack/hotkeys";
import { GLOBAL_SHORTCUTS, LAYOUT_CYCLE_SHORTCUT } from "./global-shortcuts";

type ShortcutGroup =
  | "Global"
  | "Navigate"
  | "View"
  | "Selection"
  | "Saves"
  | "Viewer"
  | "Sources"
  | "Tags"
  | "Library";

export interface ShortcutDef {
  label: string;
  group: ShortcutGroup;
  keys?: Hotkey;
  sequence?: readonly Hotkey[];
}

export const SHORTCUTS = {
  ...GLOBAL_SHORTCUTS,
  "nav.library": {
    sequence: ["G", "L"],
    label: "Go to Library",
    group: "Navigate",
  },
  "nav.sources": {
    sequence: ["G", "S"],
    label: "Go to Sources",
    group: "Navigate",
  },
  "nav.downloads": {
    sequence: ["G", "D"],
    label: "Go to Downloads",
    group: "Navigate",
  },
  "nav.trash": {
    sequence: ["G", "T"],
    label: "Go to Trash",
    group: "Navigate",
  },
  "nav.settings": {
    sequence: ["G", ","],
    label: "Go to Settings",
    group: "Navigate",
  },
  "nav.back": { keys: "Mod+[", label: "Back", group: "Navigate" },
  "nav.forward": { keys: "Mod+]", label: "Forward", group: "Navigate" },
  "nav.scroll-top": {
    keys: "Mod+ArrowUp",
    label: "Scroll to Top",
    group: "Navigate",
  },
  "nav.scroll-bottom": {
    keys: "Mod+ArrowDown",
    label: "Scroll to Bottom",
    group: "Navigate",
  },
  "library.search": { keys: "Mod+K", label: "Search Pond", group: "Navigate" },
  "app.settings": {
    keys: "Mod+,",
    label: "Settings",
    group: "Navigate",
  },

  "app.close-window": {
    keys: "Mod+W",
    label: "Close Window",
    group: "Navigate",
  },

  "view.zoom-in": { keys: "Mod+=", label: "Zoom In", group: "View" },
  "view.zoom-out": { keys: "Mod+-", label: "Zoom Out", group: "View" },
  "view.zoom-reset": { keys: "Mod+0", label: "Reset Zoom", group: "View" },
  "view.layout-cycle": LAYOUT_CYCLE_SHORTCUT,
  "view.layout-waterfall": {
    keys: "1",
    label: "Waterfall Layout",
    group: "View",
  },
  "view.layout-grid": { keys: "2", label: "Grid Layout", group: "View" },
  "view.layout-justified": {
    keys: "3",
    label: "Justified Layout",
    group: "View",
  },
  "view.layout-list": { keys: "4", label: "List Layout", group: "View" },
  "view.inspector": { keys: "Mod+I", label: "Toggle Details", group: "View" },
  "view.sidebar": { keys: "[", label: "Toggle Sidebar", group: "View" },
  "view.agent": { keys: "]", label: "Toggle Assistant", group: "View" },
  "view.grayscale": {
    keys: "Mod+Alt+G",
    label: "Grayscale Overlay",
    group: "View",
  },
  "view.pin-preview": {
    keys: "Mod+Shift+P",
    label: "Pin Preview",
    group: "View",
  },
  "view.options": { keys: "V", label: "View Options", group: "View" },
  "view.display": { keys: "D", label: "Display Options", group: "View" },
  "view.sort-dir": {
    keys: "Y",
    label: "Toggle Sort Direction",
    group: "View",
  },
  "view.sort-key": {
    keys: "Shift+Y",
    label: "Cycle Sort Key",
    group: "View",
  },
  "view.theme-cycle": {
    keys: "Mod+Shift+D",
    label: "Cycle Appearance",
    group: "View",
  },

  "grid.prev": {
    keys: "ArrowLeft",
    label: "Previous Save",
    group: "Selection",
  },
  "grid.next": { keys: "ArrowRight", label: "Next Save", group: "Selection" },
  "grid.extend-prev": {
    keys: "Shift+ArrowLeft",
    label: "Extend Selection Left",
    group: "Selection",
  },
  "grid.extend-next": {
    keys: "Shift+ArrowRight",
    label: "Extend Selection Right",
    group: "Selection",
  },
  "grid.open": { keys: "Enter", label: "Open Save", group: "Selection" },
  "grid.preview": { keys: "Space", label: "Preview Save", group: "Selection" },
  "grid.select-all": {
    keys: "Mod+A",
    label: "Select All",
    group: "Selection",
  },
  "grid.clear": {
    keys: "Escape",
    label: "Clear Selection",
    group: "Selection",
  },
  "selection.run": { keys: "W", label: "Run on Selection", group: "Selection" },
  "selection.export": {
    keys: "X",
    label: "Export Selection",
    group: "Selection",
  },

  "trash.empty": {
    keys: "Mod+Shift+Backspace",
    label: "Empty Trash",
    group: "Saves",
  },

  "save.open": { keys: "O", label: "Open with Default App", group: "Saves" },
  "save.copy-image": {
    keys: "Mod+C",
    label: "Copy Image or Video",
    group: "Saves",
  },
  "save.copy-url": { keys: "Mod+Shift+C", label: "Copy URL", group: "Saves" },
  "save.copy-id": { keys: "I", label: "Copy Save ID", group: "Saves" },
  "save.copy-tags": {
    keys: "Mod+Shift+T",
    label: "Copy Tags",
    group: "Saves",
  },
  "save.paste-tags": {
    keys: "Mod+Shift+V",
    label: "Paste Tags",
    group: "Saves",
  },
  "save.export": { keys: "Mod+E", label: "Export", group: "Saves" },
  "save.refresh": { keys: "R", label: "Refresh Details", group: "Saves" },
  "save.add-tag": { keys: "A", label: "Add Tag", group: "Saves" },
  "save.rate-0": { keys: "Alt+0", label: "Clear Rating", group: "Saves" },
  "save.rate-1": { keys: "Alt+1", label: "Rate 1 Star", group: "Saves" },
  "save.rate-2": { keys: "Alt+2", label: "Rate 2 Stars", group: "Saves" },
  "save.rate-3": { keys: "Alt+3", label: "Rate 3 Stars", group: "Saves" },
  "save.rate-4": { keys: "Alt+4", label: "Rate 4 Stars", group: "Saves" },
  "save.rate-5": { keys: "Alt+5", label: "Rate 5 Stars", group: "Saves" },
  "save.rate-next-0": {
    keys: "Alt+Shift+0",
    label: "Clear Rating and Advance",
    group: "Saves",
  },
  "save.rate-next-1": {
    keys: "Alt+Shift+1",
    label: "Rate 1 Star and Advance",
    group: "Saves",
  },
  "save.rate-next-2": {
    keys: "Alt+Shift+2",
    label: "Rate 2 Stars and Advance",
    group: "Saves",
  },
  "save.rate-next-3": {
    keys: "Alt+Shift+3",
    label: "Rate 3 Stars and Advance",
    group: "Saves",
  },
  "save.rate-next-4": {
    keys: "Alt+Shift+4",
    label: "Rate 4 Stars and Advance",
    group: "Saves",
  },
  "save.rate-next-5": {
    keys: "Alt+Shift+5",
    label: "Rate 5 Stars and Advance",
    group: "Saves",
  },
  "save.rename": { keys: "N", label: "Rename", group: "Saves" },
  "save.open-url": { keys: "U", label: "Open Original URL", group: "Saves" },
  "save.reveal": { keys: "F", label: "Reveal in Finder", group: "Saves" },
  "save.trash": { keys: "Backspace", label: "Move to Trash", group: "Saves" },
  "save.restore": {
    keys: "Backspace",
    label: "Restore from Trash",
    group: "Saves",
  },
  "save.delete-forever": {
    keys: "Mod+Backspace",
    label: "Delete Forever",
    group: "Saves",
  },

  "viewer.step-prev": {
    keys: "ArrowLeft",
    label: "Previous Image or Save",
    group: "Viewer",
  },
  "viewer.step-next": {
    keys: "ArrowRight",
    label: "Next Image or Save",
    group: "Viewer",
  },
  "viewer.prev-save": {
    keys: "Mod+ArrowLeft",
    label: "Previous Save",
    group: "Viewer",
  },
  "viewer.next-save": {
    keys: "Mod+ArrowRight",
    label: "Next Save",
    group: "Viewer",
  },
  "viewer.copy-frame": {
    keys: "Shift+C",
    label: "Copy Current Frame",
    group: "Viewer",
  },
  "viewer.save-frame": {
    keys: "Shift+S",
    label: "Save Current Frame",
    group: "Viewer",
  },
  "viewer.prev-slide": {
    keys: "[",
    label: "Previous Slide",
    group: "Viewer",
  },
  "viewer.next-slide": {
    keys: "]",
    label: "Next Slide",
    group: "Viewer",
  },
  "viewer.mute": { keys: "M", label: "Mute", group: "Viewer" },
  "viewer.fullscreen": {
    keys: "Mod+Shift+F",
    label: "Full Screen",
    group: "Viewer",
  },
  "viewer.zoom-fit": { keys: "`", label: "Zoom to Fit", group: "Viewer" },
  "viewer.actual-size": {
    keys: "Mod+1",
    label: "Actual Size",
    group: "Viewer",
  },
  "viewer.comment": { keys: "C", label: "Comment Mode", group: "Viewer" },

  "sources.new": { keys: "Mod+N", label: "New Source", group: "Sources" },
  "sources.sync-all": {
    keys: "Mod+Shift+S",
    label: "Sync All",
    group: "Sources",
  },

  "viewer.play-pause": {
    keys: "Space",
    label: "Play or Pause",
    group: "Viewer",
  },
  "viewer.frame-prev": { keys: "[", label: "Previous Frame", group: "Viewer" },
  "viewer.frame-next": { keys: "]", label: "Next Frame", group: "Viewer" },
  "viewer.frame-prev-ten": {
    keys: normalizeHotkey("Shift+["),
    label: "Back Ten Frames",
    group: "Viewer",
  },
  "viewer.frame-next-ten": {
    keys: normalizeHotkey("Shift+]"),
    label: "Forward Ten Frames",
    group: "Viewer",
  },
  "viewer.seek-back": {
    keys: "Shift+ArrowLeft",
    label: "Seek Back",
    group: "Viewer",
  },
  "viewer.seek-forward": {
    keys: "Shift+ArrowRight",
    label: "Seek Forward",
    group: "Viewer",
  },
  "viewer.speed-up": {
    keys: ".",
    label: "Speed Up",
    group: "Viewer",
  },
  "viewer.speed-down": {
    keys: ",",
    label: "Slow Down",
    group: "Viewer",
  },
  "viewer.volume-up": {
    keys: "Shift+ArrowUp",
    label: "Volume Up",
    group: "Viewer",
  },
  "viewer.volume-down": {
    keys: "Shift+ArrowDown",
    label: "Volume Down",
    group: "Viewer",
  },

  "save.assign-folders": {
    keys: "Alt+F",
    label: "Assign Folders",
    group: "Saves",
  },

  "tags.rename": { keys: "E", label: "Rename", group: "Tags" },

  "library.rescan": {
    keys: "Mod+Shift+R",
    label: "Rescan Library",
    group: "Library",
  },
  "library.new-folder": {
    keys: "Mod+Shift+N",
    label: "New Folder",
    group: "Library",
  },
  "library.new-tag": {
    keys: "Mod+T",
    label: "New Tag",
    group: "Library",
  },
  "library.new-tag-group": {
    keys: "Mod+Alt+T",
    label: "New Tag Group",
    group: "Library",
  },
  "library.new-note": {
    keys: "Mod+Alt+N",
    label: "New Note",
    group: "Library",
  },
  "library.import-files": {
    keys: "Mod+O",
    label: "Import Files",
    group: "Library",
  },
  "library.import-folders": {
    keys: "Mod+Shift+O",
    label: "Import Folders",
    group: "Library",
  },
  "library.import-links": {
    keys: "Mod+Shift+U",
    label: "Import from Links",
    group: "Library",
  },
} as const satisfies Record<string, ShortcutDef>;

export type ShortcutId = keyof typeof SHORTCUTS;
export type ShortcutBindings = { [Id in ShortcutId]: ShortcutDef };

export function isValidShortcut(chord: string): boolean {
  const result = validateHotkey(chord);
  return result.valid && result.warnings.length === 0;
}

export function isShortcutId(id: string): id is ShortcutId {
  return Object.hasOwn(SHORTCUTS, id);
}

export interface ShortcutPreferences {
  profile: "pond" | "eagle";
  overrides: Record<string, string>;
}

export const RATING_COMMANDS = [
  { rating: 0, id: "save.rate-0", nextId: "save.rate-next-0" },
  { rating: 1, id: "save.rate-1", nextId: "save.rate-next-1" },
  { rating: 2, id: "save.rate-2", nextId: "save.rate-next-2" },
  { rating: 3, id: "save.rate-3", nextId: "save.rate-next-3" },
  { rating: 4, id: "save.rate-4", nextId: "save.rate-next-4" },
  { rating: 5, id: "save.rate-5", nextId: "save.rate-next-5" },
] as const;

export function resolveShortcuts(
  preferences: ShortcutPreferences,
): ShortcutBindings {
  const resolved: ShortcutBindings = { ...SHORTCUTS };
  if (preferences.profile === "eagle") {
    resolved["save.assign-folders"] = {
      ...resolved["save.assign-folders"],
      keys: "F",
    };
    resolved["save.add-tag"] = { ...resolved["save.add-tag"], keys: "T" };
    resolved["save.reveal"] = { ...resolved["save.reveal"], keys: "Mod+R" };
    for (const id of [
      "view.layout-waterfall",
      "view.layout-grid",
      "view.layout-justified",
      "view.layout-list",
    ] as const) {
      resolved[id] = {
        ...resolved[id],
        keys: normalizeHotkey(`Alt+${SHORTCUTS[id].keys}`),
      };
    }
    for (const command of RATING_COMMANDS) {
      resolved[command.id] = {
        ...resolved[command.id],
        keys: normalizeHotkey(String(command.rating)),
      };
      resolved[command.nextId] = {
        ...resolved[command.nextId],
        keys: normalizeHotkey(`Shift+${command.rating}`),
      };
    }
  }
  for (const id of Object.keys(resolved).filter(isShortcutId)) {
    const override = preferences.overrides[id];
    if (override && resolved[id].keys && isValidShortcut(override))
      resolved[id] = { ...resolved[id], keys: normalizeHotkey(override) };
  }
  return resolved;
}
