import { formatForDisplay } from "@tanstack/react-hotkeys";

/**
 * Single source of truth for app shortcuts: hotkey effects register from this
 * map, menu builders derive their glyphs from it, and the cheat sheet renders
 * it, so bindings and displayed shortcuts cannot drift apart.
 */

export type ShortcutGroup =
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
  /** Simultaneous chord, e.g. `Mod+K`. Mutually exclusive with `sequence`. */
  keys?: string;
  /** Sequential chords, e.g. `["G", "L"]` for Linear-style go. */
  sequence?: readonly string[];
}

export const SHORTCUTS = {
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
  "dock.ask": { keys: "Mod+K", label: "AI Search", group: "Navigate" },
  "dock.search": { keys: "Mod+F", label: "Search", group: "Navigate" },
  "app.shortcuts": {
    keys: "Mod+/",
    label: "Keyboard Shortcuts",
    group: "Navigate",
  },

  "view.zoom-in": { keys: "Mod+=", label: "Zoom In", group: "View" },
  "view.zoom-out": { keys: "Mod+-", label: "Zoom Out", group: "View" },
  "view.zoom-reset": { keys: "Mod+0", label: "Reset Zoom", group: "View" },
  "view.layout-cycle": {
    keys: "Mod+Shift+L",
    label: "Cycle Layout",
    group: "View",
  },
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
  "view.inspector": { keys: "Mod+I", label: "Toggle Details", group: "View" },
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
  "grid.preview": { keys: "Space", label: "Open Save", group: "Selection" },
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
    keys: "C",
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

  "sources.new": { keys: "Mod+N", label: "New Source", group: "Sources" },
  "sources.sync-all": {
    keys: "Mod+Shift+S",
    label: "Sync All Sources",
    group: "Sources",
  },

  "tags.rename": { keys: "E", label: "Rename", group: "Tags" },

  "library.rescan": {
    keys: "Mod+Shift+R",
    label: "Rescan Library",
    group: "Library",
  },
} as const satisfies Record<string, ShortcutDef>;

export type ShortcutId = keyof typeof SHORTCUTS;

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  "Navigate",
  "View",
  "Selection",
  "Saves",
  "Viewer",
  "Sources",
  "Tags",
  "Library",
];

/** Glyph tokens for a single chord (menu `shortcut: string[]` display). */
export function chordGlyphs(keys: string): string[] {
  return formatForDisplay(keys)
    .split(/[\s+]+/)
    .filter(Boolean);
}

function defOf(id: ShortcutId): ShortcutDef {
  return SHORTCUTS[id];
}

/** Glyph tokens for the menu renderer's `shortcut: string[]` display. */
export function shortcutGlyphs(id: ShortcutId): string[] {
  const def = defOf(id);
  if (def.keys) return chordGlyphs(def.keys);
  if (def.sequence) {
    return def.sequence.flatMap((step) => chordGlyphs(step));
  }
  return [];
}

/** Chord string for `useHotkeys`, or null when the shortcut is a sequence. */
export function shortcutChord(id: ShortcutId): string | null {
  return defOf(id).keys ?? null;
}

/** Sequence steps for `useHotkeySequences`, or null when the shortcut is a chord. */
export function shortcutSequence(id: ShortcutId): readonly string[] | null {
  return defOf(id).sequence ?? null;
}
