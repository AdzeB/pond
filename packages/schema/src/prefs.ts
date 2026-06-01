import type { Source } from "./db";
import type { Query } from "./filters/types";

export interface VideoDownloadSettings {
  enabled: boolean;
  maxHeight: number | null;
  maxFileSizeMb: number | null;
}

export const DEFAULT_VIDEO_DOWNLOAD: VideoDownloadSettings = {
  enabled: true,
  maxHeight: 1080,
  maxFileSizeMb: 500,
};

export interface ImageDownloadSettings {
  maxLongEdge: number | null;
  maxFileSizeMb: number | null;
}

export const DEFAULT_IMAGE_DOWNLOAD: ImageDownloadSettings = {
  maxLongEdge: 2048,
  maxFileSizeMb: 10,
};

export const SYNC_FREQUENCIES = [
  "hourly",
  "every6h",
  "daily",
  "weekly",
] as const;
export type SyncFrequency = (typeof SYNC_FREQUENCIES)[number];

export interface GlobalSyncPrefs {
  enabled: boolean;
  frequency: SyncFrequency;
  anchorTime: string;
  weekdays: number[];
  quietHours: { start: string; end: string } | null;
  onlyOnAcPower: boolean;
  onlyOnWifi: boolean;
  lastFireAt: string | null;
}

export const DEFAULT_GLOBAL_SYNC_PREFS: GlobalSyncPrefs = {
  enabled: false,
  frequency: "daily",
  anchorTime: "09:00",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  quietHours: null,
  onlyOnAcPower: false,
  onlyOnWifi: false,
  lastFireAt: null,
};

export interface SourceSyncPrefs {
  lastSyncedAt: string | null;
  lastError: string | null;
}

export const DEFAULT_SOURCE_SYNC_PREFS: SourceSyncPrefs = {
  lastSyncedAt: null,
  lastError: null,
};

export interface SmartFolder {
  id: string;
  name: string;
  query: Query;
  icon?: string | null;
  pinned: boolean;
  sortOrder: number;
}

export interface AutoTagRule {
  id: string;
  enabled: boolean;
  // All provided conditions must match (AND). A rule with no conditions never
  // matches, so it can't tag everything.
  source?: Source | null;
  urlContains?: string | null;
  authorContains?: string | null;
  titleContains?: string | null;
  addTags: string[];
}

export interface Prefs {
  preferences: {
    theme: "system" | "light" | "dark" | "high-contrast";
    pointerCursors: boolean;
    reduceMotion: "system" | "always" | "never";
    reduceTransparency: boolean;
    uiFontSize: number;
    codeFontSize: number;
  };
  notifications: {
    saveComplete: boolean;
    sound: boolean;
  };
  trash: {
    autoEmptyDays: number | null;
    confirmBeforeEmpty: boolean;
  };
  window: {
    closeToTray: boolean;
    launchHidden: boolean;
    restorePosition: boolean;
    bounds: { x: number; y: number; width: number; height: number } | null;
  };
  quickCapture: {
    menuBarIcon: boolean;
    launchAtLogin: boolean;
  };
  tagPicker: {
    layout: "list" | "grid";
    gridSize: "sm" | "md" | "lg";
    showStarred: boolean;
    showRecently: boolean;
    showRecommended: boolean;
    showCounts: boolean;
    pinned: boolean;
  };
  allTags: {
    layout: "list" | "grid";
    gridSize: "sm" | "md" | "lg";
    showCounts: boolean;
    sort: "name" | "count" | "recent";
  };
  search: {
    resultLimit: number;
  };
  api: {
    port: number;
    bindAddress: "loopback" | "lan";
    allowedOrigins: string[];
  };
  updates: {
    channel: "stable" | "beta";
    autoInstall: boolean;
  };
  developer: {
    developerMode: boolean;
    verboseLogging: boolean;
  };
  sync: {
    global: GlobalSyncPrefs;
    sources: Partial<Record<Source, SourceSyncPrefs>>;
    handles: Partial<Record<Source, string>>;
  };
  storage: {
    guardsEnabled: boolean;
    maxLibraryGb: number | null;
    warnAtPercent: number;
    action: "warn" | "pauseSync" | "pauseVideo";
    watchIntervalMinutes: number;
  };
  smartFolders: {
    items: SmartFolder[];
  };
  autoTag: {
    enabled: boolean;
    rules: AutoTagRule[];
  };
}

export const DEFAULT_PREFS: Prefs = {
  preferences: {
    theme: "system",
    pointerCursors: false,
    reduceMotion: "system",
    reduceTransparency: false,
    uiFontSize: 13,
    codeFontSize: 12,
  },
  notifications: {
    saveComplete: true,
    sound: false,
  },
  trash: {
    autoEmptyDays: null,
    confirmBeforeEmpty: true,
  },
  window: {
    closeToTray: false,
    launchHidden: false,
    restorePosition: true,
    bounds: null,
  },
  quickCapture: {
    menuBarIcon: true,
    launchAtLogin: false,
  },
  tagPicker: {
    layout: "list",
    gridSize: "md",
    showStarred: true,
    showRecently: true,
    showRecommended: true,
    showCounts: true,
    pinned: false,
  },
  allTags: {
    layout: "grid",
    gridSize: "md",
    showCounts: true,
    sort: "name",
  },
  search: {
    resultLimit: 200,
  },
  api: {
    port: 41610,
    bindAddress: "loopback",
    allowedOrigins: [],
  },
  updates: {
    channel: "stable",
    autoInstall: true,
  },
  developer: {
    developerMode: false,
    verboseLogging: false,
  },
  sync: {
    global: DEFAULT_GLOBAL_SYNC_PREFS,
    sources: {},
    handles: {},
  },
  storage: {
    guardsEnabled: false,
    maxLibraryGb: 50,
    warnAtPercent: 80,
    action: "warn",
    watchIntervalMinutes: 5,
  },
  smartFolders: {
    items: [],
  },
  autoTag: {
    enabled: true,
    rules: [],
  },
};
