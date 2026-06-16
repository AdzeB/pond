import { z } from "zod";
import {
  CUSTOM_THEME_DEFAULT,
  DEFAULT_PRESET_ID,
  DEFAULT_SIDEBAR_SOURCES,
  DEFAULT_SYSTEM_DARK_ID,
  DEFAULT_SYSTEM_LIGHT_ID,
  type SidebarSourcesConfig,
  type SyncHandles,
  type SyncSources,
  type ThemeDef,
  type WindowBounds,
} from "./prefs.types";

export * from "./prefs.types";

const preferences = z.object({
  themeMode: z.enum(["preset", "system", "custom"]).catch("system"),
  presetId: z.string().catch(DEFAULT_PRESET_ID),
  systemLightId: z.string().catch(DEFAULT_SYSTEM_LIGHT_ID),
  systemDarkId: z.string().catch(DEFAULT_SYSTEM_DARK_ID),
  custom: z.custom<ThemeDef>().default(CUSTOM_THEME_DEFAULT),
  pointerCursors: z.boolean().catch(false),
  reduceMotion: z.enum(["system", "always", "never"]).catch("system"),
  reduceTransparency: z.boolean().catch(false),
  // Liquid glass: native macOS NSGlassEffectView window backing (macOS 26+),
  // refracting the desktop behind a translucent window. No-op on other
  // platforms / older macOS, and forced off by reduceTransparency. `style`
  // maps to the native regular/clear glass materials.
  liquidGlass: z.boolean().catch(true),
  liquidGlassStyle: z.enum(["regular", "clear"]).catch("regular"),
  // Blur sensitive (NSFW) media until classified safe; opt-in.
  blurSensitiveMedia: z.boolean().catch(false),
  // Twitter cover: "media" prefers attached media, "screenshot" always renders the card.
  tweetCover: z.enum(["media", "screenshot"]).catch("media"),
});

const trash = z.object({
  autoEmptyDays: z.number().nullable().catch(null),
  confirmBeforeEmpty: z.boolean().catch(true),
});

const windowSlice = z.object({
  closeToTray: z.boolean().catch(false),
  launchHidden: z.boolean().catch(false),
  restorePosition: z.boolean().catch(true),
  bounds: z.custom<WindowBounds | null>().default(null),
});

const quickCapture = z.object({
  menuBarIcon: z.boolean().catch(true),
  launchAtLogin: z.boolean().catch(false),
});

const tagPicker = z.object({
  layout: z.enum(["list", "grid"]).catch("list"),
  gridSize: z.enum(["sm", "md", "lg"]).catch("md"),
  showStarred: z.boolean().catch(true),
  showRecently: z.boolean().catch(true),
  showRecommended: z.boolean().catch(true),
  showCounts: z.boolean().catch(true),
  pinned: z.boolean().catch(false),
});

const allTags = z.object({
  layout: z.enum(["list", "grid"]).catch("grid"),
  gridSize: z.enum(["sm", "md", "lg"]).catch("md"),
  showCounts: z.boolean().catch(true),
  sort: z.enum(["name", "count", "recent"]).catch("name"),
});

const sidebar = z.object({
  sources: z.custom<SidebarSourcesConfig>().default(DEFAULT_SIDEBAR_SOURCES),
});

const api = z.object({
  port: z.number().catch(41610),
  bindAddress: z.enum(["loopback", "lan"]).catch("loopback"),
  allowedOrigins: z.array(z.string()).catch([]),
});

const updates = z.object({
  autoInstall: z.boolean().catch(true),
});

const developer = z.object({
  developerMode: z.boolean().catch(false),
  verboseLogging: z.boolean().catch(false),
});

const sync = z.object({
  sources: z.custom<SyncSources>().default({}),
  handles: z.custom<SyncHandles>().default({}),
});

const storage = z.object({
  guardsEnabled: z.boolean().catch(false),
  maxLibraryGb: z.number().nullable().catch(50),
  warnAtPercent: z.number().catch(80),
  action: z.enum(["warn", "pauseSync", "pauseVideo"]).catch("warn"),
  watchIntervalMinutes: z.number().catch(5),
});

// Each slice catches to its own defaults so a corrupt slice resets in isolation.
const PrefsObject = z.object({
  preferences: preferences.catch(preferences.parse({})),
  trash: trash.catch(trash.parse({})),
  window: windowSlice.catch(windowSlice.parse({})),
  quickCapture: quickCapture.catch(quickCapture.parse({})),
  tagPicker: tagPicker.catch(tagPicker.parse({})),
  allTags: allTags.catch(allTags.parse({})),
  sidebar: sidebar.catch(sidebar.parse({})),
  api: api.catch(api.parse({})),
  updates: updates.catch(updates.parse({})),
  developer: developer.catch(developer.parse({})),
  sync: sync.catch(sync.parse({})),
  storage: storage.catch(storage.parse({})),
});

export type Prefs = z.infer<typeof PrefsObject>;

export const DEFAULT_PREFS: Prefs = PrefsObject.parse({});

// Top-level catch keeps parsing non-throwing for wholly corrupt input.
export const PrefsSchema = PrefsObject.catch(DEFAULT_PREFS);

export type PrefsParsed = z.infer<typeof PrefsSchema>;
