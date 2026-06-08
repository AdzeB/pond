import {
  CUSTOM_THEME_DEFAULT,
  DEFAULT_GLOBAL_SYNC_PREFS,
  DEFAULT_PRESET_ID,
  DEFAULT_SIDEBAR_SOURCES,
  DEFAULT_SYSTEM_DARK_ID,
  DEFAULT_SYSTEM_LIGHT_ID,
} from "../prefs.types";
import type { PrefsManifest } from "./types";

const TYPES = "../prefs.types";

// The complete prefs data model. Each slice/field declares a type and a
// default; the generator turns this into the Prefs interface, DEFAULT_PREFS,
// and a zod validator. Keep slice order stable for clean generated diffs.
export const SETTINGS_PREFS = {
  preferences: {
    kind: "fields",
    fields: {
      themeMode: {
        type: { ts: "ThemeMode", import: TYPES },
        default: "system",
      },
      presetId: { type: "string", default: DEFAULT_PRESET_ID },
      systemLightId: { type: "string", default: DEFAULT_SYSTEM_LIGHT_ID },
      systemDarkId: { type: "string", default: DEFAULT_SYSTEM_DARK_ID },
      custom: {
        type: { ts: "ThemeDef", import: TYPES },
        default: CUSTOM_THEME_DEFAULT,
      },
      pointerCursors: { type: "boolean", default: false },
      reduceMotion: {
        type: { enum: ["system", "always", "never"] },
        default: "system",
      },
      reduceTransparency: { type: "boolean", default: false },
    },
  },
  notifications: {
    kind: "fields",
    fields: {
      saveComplete: { type: "boolean", default: true },
      sound: { type: "boolean", default: false },
    },
  },
  trash: {
    kind: "fields",
    fields: {
      autoEmptyDays: { type: "number", nullable: true, default: null },
      confirmBeforeEmpty: { type: "boolean", default: true },
    },
  },
  window: {
    kind: "fields",
    fields: {
      closeToTray: { type: "boolean", default: false },
      launchHidden: { type: "boolean", default: false },
      restorePosition: { type: "boolean", default: true },
      bounds: {
        type: { ts: "WindowBounds", import: TYPES },
        nullable: true,
        default: null,
      },
    },
  },
  quickCapture: {
    kind: "fields",
    fields: {
      menuBarIcon: { type: "boolean", default: true },
      launchAtLogin: { type: "boolean", default: false },
    },
  },
  tagPicker: {
    kind: "fields",
    fields: {
      layout: { type: { enum: ["list", "grid"] }, default: "list" },
      gridSize: { type: { enum: ["sm", "md", "lg"] }, default: "md" },
      showStarred: { type: "boolean", default: true },
      showRecently: { type: "boolean", default: true },
      showRecommended: { type: "boolean", default: true },
      showCounts: { type: "boolean", default: true },
      pinned: { type: "boolean", default: false },
    },
  },
  allTags: {
    kind: "fields",
    fields: {
      layout: { type: { enum: ["list", "grid"] }, default: "grid" },
      gridSize: { type: { enum: ["sm", "md", "lg"] }, default: "md" },
      showCounts: { type: "boolean", default: true },
      sort: { type: { enum: ["name", "count", "recent"] }, default: "name" },
    },
  },
  sidebar: {
    kind: "fields",
    fields: {
      sources: {
        type: { ts: "SidebarSourcesConfig", import: TYPES },
        default: DEFAULT_SIDEBAR_SOURCES,
      },
    },
  },
  api: {
    kind: "fields",
    fields: {
      port: { type: "number", default: 41610 },
      bindAddress: { type: { enum: ["loopback", "lan"] }, default: "loopback" },
      allowedOrigins: { type: { ts: "string[]" }, default: [] },
    },
  },
  updates: {
    kind: "fields",
    fields: {
      autoInstall: { type: "boolean", default: true },
    },
  },
  developer: {
    kind: "fields",
    fields: {
      developerMode: { type: "boolean", default: false },
      verboseLogging: { type: "boolean", default: false },
    },
  },
  sync: {
    kind: "fields",
    fields: {
      global: {
        type: { ts: "GlobalSyncPrefs", import: TYPES },
        default: DEFAULT_GLOBAL_SYNC_PREFS,
      },
      sources: { type: { ts: "SyncSources", import: TYPES }, default: {} },
      handles: { type: { ts: "SyncHandles", import: TYPES }, default: {} },
    },
  },
  storage: {
    kind: "fields",
    fields: {
      guardsEnabled: { type: "boolean", default: false },
      maxLibraryGb: { type: "number", nullable: true, default: 50 },
      warnAtPercent: { type: "number", default: 80 },
      action: {
        type: { enum: ["warn", "pauseSync", "pauseVideo"] },
        default: "warn",
      },
      watchIntervalMinutes: { type: "number", default: 5 },
    },
  },
} as const satisfies PrefsManifest;
