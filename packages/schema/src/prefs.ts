import { z } from "zod";
import {
  DEFAULT_APP_ICON,
  DEFAULT_DARK_PRESET_ID,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_PRESET_ID,
  DEFAULT_LIGHT_THEME,
  DEFAULT_SOURCE_METRICS,
  type SourceMetricDisplay,
  type SyncAccounts,
  type SyncHandles,
  type SyncSources,
  type SyncWatches,
  type ThemeAppearance,
  type WindowBounds,
} from "./prefs.types";
import { getPreset, migrateThemeDef, presetDef } from "./theme-presets";

export * from "./prefs.types";

const soundFeel = z
  .enum([
    "soft",
    "crisp",
    "thock",
    "glass",
    "metal",
    "lofi",
    "retro",
    "organic",
    "airy",
    "punchy",
  ])
  .catch("soft");

const lightThemeDefSchema = z
  .object({
    accent: z.string(),
    background: z.string(),
    foreground: z.string(),
    contrast: z.number(),
  })
  .catch(DEFAULT_LIGHT_THEME);

const darkThemeDefSchema = z
  .object({
    accent: z.string(),
    background: z.string(),
    foreground: z.string(),
    contrast: z.number(),
  })
  .catch(DEFAULT_DARK_THEME);

/** Lift themeMode/presetId/custom into appearance + light/dark sides. */
function migratePreferencesTheme(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  if (
    typeof raw.appearance === "string" &&
    raw.light &&
    raw.dark &&
    typeof raw.lightPresetId === "string" &&
    typeof raw.darkPresetId === "string"
  ) {
    return {
      ...raw,
      light: migrateThemeDef(raw.light, "light"),
      dark: migrateThemeDef(raw.dark, "dark"),
    };
  }

  const themeMode = raw.themeMode;
  const presetId =
    typeof raw.presetId === "string" ? raw.presetId : DEFAULT_LIGHT_PRESET_ID;
  const systemLightId =
    typeof raw.systemLightId === "string"
      ? raw.systemLightId
      : DEFAULT_LIGHT_PRESET_ID;
  const systemDarkId =
    typeof raw.systemDarkId === "string"
      ? raw.systemDarkId
      : DEFAULT_DARK_PRESET_ID;

  let appearance: ThemeAppearance = "system";
  let lightPresetId = systemLightId;
  let darkPresetId = systemDarkId;
  let light = presetDef(systemLightId, DEFAULT_LIGHT_THEME);
  let dark = presetDef(systemDarkId, DEFAULT_DARK_THEME);

  if (themeMode === "custom") {
    const legacy = raw.custom as
      | { base?: string; background?: string }
      | undefined;
    const bgHex = (legacy?.background ?? legacy?.base ?? "").toLowerCase();
    const isDarkish =
      bgHex.startsWith("#0") || bgHex.startsWith("#1") || bgHex === "#000000";
    if (isDarkish) {
      appearance = "dark";
      dark = migrateThemeDef(raw.custom, "dark");
    } else {
      appearance = "light";
      light = migrateThemeDef(raw.custom, "light");
    }
  } else if (themeMode === "preset") {
    const catalog = getPreset(presetId);
    if (catalog?.appearance === "dark") {
      appearance = "dark";
      darkPresetId = presetId;
      dark = catalog.def;
    } else {
      appearance = "light";
      lightPresetId = presetId;
      light = catalog?.def ?? presetDef(presetId, DEFAULT_LIGHT_THEME);
    }
  } else {
    appearance = "system";
    lightPresetId = systemLightId;
    darkPresetId = systemDarkId;
    light = presetDef(systemLightId, DEFAULT_LIGHT_THEME);
    dark = presetDef(systemDarkId, DEFAULT_DARK_THEME);
  }

  const {
    themeMode: _tm,
    presetId: _pid,
    systemLightId: _sl,
    systemDarkId: _sd,
    custom: _c,
    ...rest
  } = raw;

  return {
    ...rest,
    appearance,
    lightPresetId,
    darkPresetId,
    light,
    dark,
  };
}

/** Older builds stored mute as `soundFeel: "off"`; lift that into `soundsEnabled`. */
const preferences = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    let prefs = raw as Record<string, unknown>;
    if (prefs.soundFeel === "off") {
      prefs = { ...prefs, soundFeel: "soft", soundsEnabled: false };
    }
    return migratePreferencesTheme(prefs);
  },
  z.object({
    appearance: z
      .enum(["system", "light", "dark"])
      .catch("system" satisfies ThemeAppearance),
    lightPresetId: z.string().catch(DEFAULT_LIGHT_PRESET_ID),
    darkPresetId: z.string().catch(DEFAULT_DARK_PRESET_ID),
    light: lightThemeDefSchema.catch(DEFAULT_LIGHT_THEME),
    dark: darkThemeDefSchema.catch(DEFAULT_DARK_THEME),
    pointerCursors: z.boolean().catch(false),
    reduceMotion: z.enum(["system", "always", "never"]).catch("system"),
    /** "media" prefers attached media; "screenshot" always renders the card. */
    tweetCover: z.enum(["media", "screenshot"]).catch("media"),
    soundsEnabled: z.boolean().catch(true),
    soundFeel,
  }),
);

const trash = z.object({
  autoEmptyDays: z.number().nullable().catch(null),
  confirmBeforeEmpty: z.boolean().catch(true),
});

const windowSlice = z.object({
  closeToTray: z.boolean().catch(false),
  launchHidden: z.boolean().catch(false),
  restorePosition: z.boolean().catch(true),
  bounds: z.custom<WindowBounds | null>().default(null),
  /** "continue" restores the last route; the others jump to a fixed page. */
  startupPage: z
    .enum(["continue", "library", "sources", "trash", "settings"])
    .catch("continue"),
  /** Crayon folder name under packages/icons/brand/tints; missing files fall back to aqua. */
  appIcon: z.string().min(1).catch(DEFAULT_APP_ICON),
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

/** `metrics` is the ordered list of pinned metric ids; `days` is the rolling window the KPIs summarize. */
const sourcesView = z.object({
  metrics: z.custom<string[]>().default(DEFAULT_SOURCE_METRICS),
  metricDisplay: z.custom<Record<string, SourceMetricDisplay>>().default({}),
  days: z.number().catch(7),
});

const api = z.object({
  port: z.number().catch(41610),
  bindAddress: z.enum(["loopback", "lan"]).catch("loopback"),
  allowedOrigins: z.array(z.string()).catch([]),
});

const updates = z.object({
  autoInstall: z.boolean().catch(true),
});

const sync = z.object({
  /** Connected accounts keyed by account id; several may share one source. */
  accounts: z.custom<SyncAccounts>().default({}),
  /** Watched public accounts keyed by watch id. */
  watches: z.custom<SyncWatches>().default({}),
  /** @deprecated Drained into `accounts` by the one-time migration and kept empty afterwards. */
  sources: z.custom<SyncSources>().default({}),
  handles: z.custom<SyncHandles>().default({}),
  /** Background sync scheduler; defers to the rate governor. */
  cron: z
    .object({
      enabled: z.boolean().catch(true),
      intervalHours: z.number().min(1).catch(6),
    })
    .catch({ enabled: true, intervalHours: 6 }),
});

const storage = z.object({
  guardsEnabled: z.boolean().catch(false),
  maxLibraryGb: z.number().nullable().catch(50),
  warnAtPercent: z.number().catch(80),
  action: z.enum(["warn", "pauseSync", "pauseVideo"]).catch("warn"),
  watchIntervalMinutes: z.number().catch(5),
});

/**
 * Ask and enrichments always run on-device; embeddings use Transformers.js in the renderer.
 */
const ai = z.object({
  /** Natural-language -> structured-query compiler LLM stage. */
  nlCompiler: z.boolean().catch(false),
  /** On-device embeddings plus semantic ranking of free-text search. */
  semanticSearch: z.boolean().catch(false),
  /** Transformers.js feature-extraction model for embeddings. */
  embedModelId: z.string().catch("Xenova/all-MiniLM-L6-v2"),
  /** Heavy enrichers (caption/OCR, transcript, CLIP) default off given download size; all run locally via Transformers.js. */
  enableCaption: z.boolean().catch(false),
  enableOcr: z.boolean().catch(false),
  enableTranscript: z.boolean().catch(false),
  enableClip: z.boolean().catch(false),
  enableAesthetic: z.boolean().catch(false),
  /** Non-destructive text enrichers that only suggest; cheap but opt-in. */
  enableAutoTitle: z.boolean().catch(false),
  enableSuggestedTags: z.boolean().catch(false),
  /** Optional model-id overrides for the heavy enrichers; empty means default. */
  captionModelId: z.string().catch(""),
  clipModelId: z.string().catch(""),
  whisperModelId: z.string().catch(""),
});

const recentSaveVisit = z.object({
  saveId: z.string(),
  visitedAt: z.number(),
});

export type RecentSaveVisit = z.infer<typeof recentSaveVisit>;

/** Feeds the native History menu; save ids are pond-specific, so this is pond-scoped too. */
const saveRecents = z.object({
  entries: z.array(recentSaveVisit).catch([]),
});

/** Each slice catches to its own defaults so a corrupt slice resets in isolation. */
const PrefsObject = z.object({
  preferences: preferences.catch(preferences.parse({})),
  trash: trash.catch(trash.parse({})),
  window: windowSlice.catch(windowSlice.parse({})),
  quickCapture: quickCapture.catch(quickCapture.parse({})),
  tagPicker: tagPicker.catch(tagPicker.parse({})),
  allTags: allTags.catch(allTags.parse({})),
  sourcesView: sourcesView.catch(sourcesView.parse({})),
  api: api.catch(api.parse({})),
  updates: updates.catch(updates.parse({})),
  sync: sync.catch(sync.parse({})),
  storage: storage.catch(storage.parse({})),
  ai: ai.catch(ai.parse({})),
  saveRecents: saveRecents.catch(saveRecents.parse({})),
});

export type Prefs = z.infer<typeof PrefsObject>;

export const DEFAULT_PREFS: Prefs = PrefsObject.parse({});

/** Top-level catch keeps parsing non-throwing for wholly corrupt input. */
export const PrefsSchema = PrefsObject.catch(DEFAULT_PREFS);

export type PrefsParsed = z.infer<typeof PrefsSchema>;
