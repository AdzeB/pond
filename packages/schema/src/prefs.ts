import { z } from "zod";
import { FolderPresentationSchema } from "./folder-presentation";
import { FolderRulesSchema } from "./folder-rules";
import { LocaleSchema } from "./locales";
import {
  DEFAULT_APP_ICON,
  DEFAULT_DARK_PRESET_ID,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_PRESET_ID,
  DEFAULT_LIGHT_THEME,
  DEFAULT_SOURCE_METRICS,
  DEFAULT_SYNC_CRON,
  type SourceMetricDisplay,
  type SyncAccounts,
  type SyncHandles,
  type SyncSources,
  type SyncWatches,
  type ThemeAppearance,
  type ThemeDef,
  type WindowBounds,
} from "./prefs.types";
import { SavedViewPresentationSchema } from "./saved-view-presentation";
import {
  getPreset,
  migrateThemeDef,
  presetDef,
  StoredThemeDefSchema,
} from "./theme-presets";
import { ViewerPrefsSchema } from "./viewer-prefs";

export * from "./prefs.types";

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

const StoredPreferencesSchema = z
  .object({
    appearance: z.string().optional().catch(undefined),
    lightPresetId: z.string().optional().catch(undefined),
    darkPresetId: z.string().optional().catch(undefined),
    light: StoredThemeDefSchema.optional().catch(undefined),
    dark: StoredThemeDefSchema.optional().catch(undefined),
    pointerCursors: z.boolean().optional().catch(undefined),
    reduceMotion: z.string().optional().catch(undefined),
    tweetCover: z.string().optional().catch(undefined),
    soundsEnabled: z.boolean().optional().catch(undefined),
    autoSelectAfterImport: z.boolean().optional().catch(undefined),
    soundFeel: z.string().optional().catch(undefined),
    themeMode: z.string().optional().catch(undefined),
    presetId: z.string().optional().catch(undefined),
    systemLightId: z.string().optional().catch(undefined),
    systemDarkId: z.string().optional().catch(undefined),
    custom: StoredThemeDefSchema.optional().catch(undefined),
  })
  .catch({});

const APPEARANCES = ["system", "light", "dark"] as const;

function toAppearance(value: string | undefined): ThemeAppearance {
  return APPEARANCES.find((appearance) => appearance === value) ?? "system";
}

interface MigratedPreferences {
  appearance: ThemeAppearance;
  lightPresetId: string;
  darkPresetId: string;
  light: ThemeDef;
  dark: ThemeDef;
  pointerCursors?: boolean;
  reduceMotion?: string;
  tweetCover?: string;
  soundsEnabled?: boolean;
  autoSelectAfterImport?: boolean;
}

function migratePreferencesTheme(
  stored: z.infer<typeof StoredPreferencesSchema>,
): MigratedPreferences {
  const carried = {
    pointerCursors: stored.pointerCursors,
    reduceMotion: stored.reduceMotion,
    tweetCover: stored.tweetCover,
    soundsEnabled: stored.soundFeel === "off" ? false : stored.soundsEnabled,
    autoSelectAfterImport: stored.autoSelectAfterImport,
  };

  if (
    stored.appearance &&
    stored.light &&
    stored.dark &&
    stored.lightPresetId &&
    stored.darkPresetId
  ) {
    return {
      ...carried,
      appearance: toAppearance(stored.appearance),
      lightPresetId: stored.lightPresetId,
      darkPresetId: stored.darkPresetId,
      light: migrateThemeDef(stored.light, "light"),
      dark: migrateThemeDef(stored.dark, "dark"),
    };
  }

  const presetId = stored.presetId ?? DEFAULT_LIGHT_PRESET_ID;
  const lightPresetId = stored.systemLightId ?? DEFAULT_LIGHT_PRESET_ID;
  const darkPresetId = stored.systemDarkId ?? DEFAULT_DARK_PRESET_ID;
  const sides = {
    ...carried,
    lightPresetId,
    darkPresetId,
    light: presetDef(lightPresetId, DEFAULT_LIGHT_THEME),
    dark: presetDef(darkPresetId, DEFAULT_DARK_THEME),
  };

  if (stored.themeMode === "custom") {
    const custom = stored.custom ?? {};
    const background = (custom.background ?? custom.base ?? "").toLowerCase();
    const isDark =
      background.startsWith("#0") ||
      background.startsWith("#1") ||
      background === "#000000";
    return isDark
      ? { ...sides, appearance: "dark", dark: migrateThemeDef(custom, "dark") }
      : {
          ...sides,
          appearance: "light",
          light: migrateThemeDef(custom, "light"),
        };
  }

  if (stored.themeMode === "preset") {
    const preset = getPreset(presetId);
    return preset?.appearance === "dark"
      ? {
          ...sides,
          appearance: "dark",
          darkPresetId: presetId,
          dark: preset.def,
        }
      : {
          ...sides,
          appearance: "light",
          lightPresetId: presetId,
          light: preset?.def ?? presetDef(presetId, DEFAULT_LIGHT_THEME),
        };
  }

  return { ...sides, appearance: "system" };
}

/** Older builds stored mute as `soundFeel: "off"`; lift that into `soundsEnabled`. */
const preferences = z.preprocess(
  (raw) => migratePreferencesTheme(StoredPreferencesSchema.parse(raw)),
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
    tweetCover: z.enum(["media", "screenshot"]).catch("media"),
    soundsEnabled: z.boolean().catch(true),
    autoSelectAfterImport: z.boolean().catch(true),
  }),
);

export const SIDEBAR_DESTINATIONS = [
  "all",
  "uncategorized",
  "assistant",
  "untagged",
  "recentlyUsed",
  "tags",
  "random",
  "trash",
  "downloads",
  "sources",
] as const;

export type SidebarDestination = (typeof SIDEBAR_DESTINATIONS)[number];

export const SIDEBAR_BADGE_STYLES = ["count", "dot", "none"] as const;

export type SidebarBadgeStyle = (typeof SIDEBAR_BADGE_STYLES)[number];

const SidebarDestinationSchema = z.enum(SIDEBAR_DESTINATIONS);
const SidebarBadgeStyleSchema = z.enum(SIDEBAR_BADGE_STYLES);

export function normalizeSidebarDestinationOrder(
  order: readonly SidebarDestination[],
): SidebarDestination[] {
  const unique = [...new Set(order)];
  for (const [defaultIndex, destination] of SIDEBAR_DESTINATIONS.entries()) {
    if (unique.includes(destination)) continue;
    let insertionIndex = 0;
    for (let index = defaultIndex - 1; index >= 0; index -= 1) {
      const candidate = SIDEBAR_DESTINATIONS[index];
      if (candidate && unique.includes(candidate)) {
        insertionIndex = unique.indexOf(candidate) + 1;
        break;
      }
    }
    unique.splice(insertionIndex, 0, destination);
  }
  return unique;
}

const StoredSidebarSchema = z
  .object({
    showCounts: z.boolean().optional().catch(undefined),
    badgeStyle: SidebarBadgeStyleSchema.optional().catch(undefined),
  })
  .loose()
  .catch({});

const sidebar = z.preprocess(
  (raw) => {
    const stored = StoredSidebarSchema.parse(raw);
    return {
      ...stored,
      badgeStyle:
        stored.badgeStyle ?? (stored.showCounts === false ? "none" : "count"),
    };
  },
  z.object({
    // Retained so older settings patches keep round-tripping. New UI reads badgeStyle.
    showCounts: z.boolean().catch(true),
    badgeStyle: SidebarBadgeStyleSchema.catch("count"),
    badgeOverrides: z
      .partialRecord(SidebarDestinationSchema, SidebarBadgeStyleSchema)
      .catch({}),
    order: z
      .array(SidebarDestinationSchema)
      .catch([...SIDEBAR_DESTINATIONS])
      .transform(normalizeSidebarDestinationOrder),
    doubleClickBehavior: z.enum(["open", "expand-collapse"]).catch("open"),
    destinations: z
      .object({
        all: z.boolean().catch(true),
        uncategorized: z.boolean().catch(true),
        assistant: z.boolean().catch(true),
        untagged: z.boolean().catch(true),
        recentlyUsed: z.boolean().catch(true),
        tags: z.boolean().catch(true),
        random: z.boolean().catch(true),
        trash: z.boolean().catch(true),
        downloads: z.boolean().catch(true),
        sources: z.boolean().catch(true),
      })
      .catch({
        all: true,
        uncategorized: true,
        assistant: true,
        untagged: true,
        recentlyUsed: true,
        tags: true,
        random: true,
        trash: true,
        downloads: true,
        sources: true,
      }),
  }),
);

const feedback = z.object({
  sounds: z
    .object({
      interface: z.boolean().catch(true),
      saveDeletion: z.boolean().catch(true),
      folderDeletion: z.boolean().catch(true),
      screenshot: z.boolean().catch(true),
      extensionCapture: z.boolean().catch(true),
      autoImport: z.boolean().catch(true),
    })
    .catch({
      interface: true,
      saveDeletion: true,
      folderDeletion: true,
      screenshot: true,
      extensionCapture: true,
      autoImport: true,
    }),
  notifications: z
    .object({
      saveDeletion: z.boolean().catch(false),
      folderDeletion: z.boolean().catch(false),
      screenshot: z.boolean().catch(false),
      extensionCapture: z.boolean().catch(true),
      autoImport: z.boolean().catch(true),
    })
    .catch({
      saveDeletion: false,
      folderDeletion: false,
      screenshot: false,
      extensionCapture: true,
      autoImport: true,
    }),
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
  startupPage: z
    .enum(["continue", "library", "sources", "trash", "settings"])
    .catch("continue"),
  appIcon: z.string().min(1).catch(DEFAULT_APP_ICON),
  interfaceZoom: z.number().int().min(50).max(200).catch(100),
});

const system = z.object({
  proxyMode: z.enum(["system", "direct", "manual"]).catch("system"),
  proxyUrl: z.string().catch(""),
  displayColorSpace: z.enum(["auto", "srgb", "display-p3"]).catch("auto"),
  hardwareAcceleration: z.boolean().catch(true),
  vibrancy: z.boolean().catch(false),
  dockVisibility: z.enum(["automatic", "always"]).catch("automatic"),
});

const autoImport = z.object({
  enabled: z.boolean().catch(false),
  path: z.string().catch(""),
  mode: z.enum(["copy", "move"]).catch("copy"),
});

export const ScreenshotIntakeRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().catch("Screenshots"),
  enabled: z.boolean().catch(true),
  path: z.string().catch(""),
  mode: z.enum(["copy", "move"]).catch("copy"),
  folderId: z.string().nullable().catch(null),
  tags: z.array(z.string()).catch([]),
  duplicatePolicy: z.enum(["skip", "import"]).catch("skip"),
  autoSelect: z.boolean().catch(true),
  notifications: z.boolean().catch(true),
});

export const ScreenshotPrefsSchema = z.object({
  format: z.enum(["png", "jpeg", "webp"]).catch("png"),
  quality: z.number().int().min(1).max(100).catch(90),
  shortcutsEnabled: z.boolean().catch(true),
  askWhereToSave: z.boolean().catch(false),
  afterSaving: z.enum(["return", "open"]).catch("open"),
  autoTag: z.boolean().catch(true),
  copyToClipboard: z.boolean().catch(false),
  useRetina: z.boolean().catch(true),
  tool: z.enum(["native", "cleanshot", "shottr", "pond"]).catch("pond"),
  intakeRules: z.array(ScreenshotIntakeRuleSchema).catch([]),
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

const search = z.object({
  scopes: z
    .object({
      title: z.boolean().catch(true),
      description: z.boolean().catch(true),
      creator: z.boolean().catch(true),
      tags: z.boolean().catch(true),
      notes: z.boolean().catch(true),
      url: z.boolean().catch(true),
      folder: z.boolean().catch(true),
      folderDescription: z.boolean().catch(true),
      extension: z.boolean().catch(true),
      annotation: z.boolean().catch(true),
    })
    .catch({
      title: true,
      description: true,
      creator: true,
      tags: true,
      notes: true,
      url: true,
      folder: true,
      folderDescription: true,
      extension: true,
      annotation: true,
    }),
});

const allTags = z.object({
  layout: z.enum(["list", "grid"]).catch("grid"),
  gridSize: z.enum(["sm", "md", "lg"]).catch("md"),
  showCounts: z.boolean().catch(true),
  sort: z.enum(["name", "count", "recent"]).catch("name"),
  sortDirection: z.enum(["asc", "desc"]).catch("asc"),
});

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

const localization = z.object({
  locale: LocaleSchema,
});

export const FetchRecurrenceSchema = z
  .object({
    startDate: z.iso.date(),
    every: z.number().int().min(1).max(999),
    unit: z.enum(["hour", "day", "week", "month"]),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    days: z.array(z.number().int().min(0).max(6)),
  })
  .refine((rule) => rule.unit !== "week" || rule.days.length > 0, {
    message: "Choose at least one weekday",
  });

const sync = z.object({
  accounts: z.custom<SyncAccounts>().default({}),
  watches: z.custom<SyncWatches>().default({}),
  /** @deprecated Drained into `accounts` by the one-time migration and kept empty afterwards. */
  sources: z.custom<SyncSources>().default({}),
  handles: z.custom<SyncHandles>().default({}),
  cron: z
    .object({
      enabled: z.boolean().catch(true),
      intervalHours: z.number().min(1).catch(DEFAULT_SYNC_CRON.intervalHours),
      recurrence: FetchRecurrenceSchema.nullable().optional(),
      calendar: z
        .discriminatedUnion("kind", [
          z.object({
            kind: z.literal("daily"),
            time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          }),
          z.object({
            kind: z.literal("weekly"),
            time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            days: z.array(z.number().int().min(0).max(6)).min(1),
          }),
        ])
        .nullable()
        .optional(),
    })
    .catch({ ...DEFAULT_SYNC_CRON }),
});

const storage = z.object({
  lastBackup: z
    .object({
      path: z.string(),
      libraryRoot: z.string(),
      completedAt: z.string(),
    })
    .nullable()
    .catch(null),
  guardsEnabled: z.boolean().catch(false),
  maxLibraryGb: z.number().nullable().catch(50),
  warnAtPercent: z.number().catch(80),
  action: z.enum(["warn", "pauseSync", "pauseVideo"]).catch("warn"),
  watchIntervalMinutes: z.number().catch(5),
});

export const AgentReasoningSchema = z.enum([
  "provider-default",
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);
export type AgentReasoning = z.infer<typeof AgentReasoningSchema>;

export const AgentContextChoiceSchema = z.union([
  z.literal("auto"),
  z.number().int().min(4_096).max(2_000_000),
]);
export type AgentContextChoice = z.infer<typeof AgentContextChoiceSchema>;

export const AgentModelOptionsSchema = z.object({
  fast: z.boolean().catch(false),
  context: AgentContextChoiceSchema.catch("auto"),
  reasoning: AgentReasoningSchema.catch("provider-default"),
});
export type AgentModelOptions = z.infer<typeof AgentModelOptionsSchema>;

export const AgentRunControlsSchema = z.object({
  fast: z.boolean(),
  contextTokens: z.number().int().min(4_096).max(2_000_000),
  reasoning: AgentReasoningSchema,
});
export type AgentRunControls = z.infer<typeof AgentRunControlsSchema>;

const agent = z.object({
  userProfile: z.string().max(8000).optional(),
  responseInstructions: z.string().max(8000).optional(),
  languageModel: z
    .string()
    .catch("")
    .transform((value) => (value === "minnow" ? "" : value)),
  azureResourceName: z.string().catch(""),
  ollamaBaseUrl: z.string().catch("http://127.0.0.1:11434/v1"),
  lmstudioBaseUrl: z.string().catch("http://127.0.0.1:1234/v1"),
  ollamaModelId: z.string().catch("llama3.2"),
  lmstudioModelId: z.string().catch("local"),
  modelIds: z.record(z.string(), z.string()).catch({}),
  modelOptions: z.record(z.string(), AgentModelOptionsSchema).catch({}),
  customModelIds: z.record(z.string(), z.array(z.string())).optional(),
  visibleModelIds: z.record(z.string(), z.array(z.string())).optional(),
  enabledKeys: z.record(z.string(), z.boolean()).catch({}),
  addedProviders: z.array(z.string()).catch([]),
  connectedLocalProviders: z.record(z.string(), z.boolean()).optional(),
  visionModel: z.string().catch(""),
  visionModelId: z.string().optional(),
  mcpSearch: z.boolean().catch(true),
  mcpOpen: z.boolean().catch(true),
  mcpExport: z.boolean().catch(true),
});

const ai = z.object({
  semanticSearch: z.boolean().catch(false),
  embedModelId: z.string().catch(""),
  enableCaption: z.boolean().catch(false),
  enableOcr: z.boolean().catch(false),
  enableTranscript: z.boolean().catch(false),
  enableClip: z.boolean().catch(false),
  enableAesthetic: z.boolean().catch(false),
  enableSensitiveContent: z.boolean().catch(false),
  blurSensitiveThumbnails: z.boolean().catch(false),
  enableAutoTitle: z.boolean().catch(false),
  enableSuggestedTags: z.boolean().catch(false),
  captionModelId: z.string().catch(""),
  clipModelId: z.string().catch(""),
  whisperModelId: z.string().catch(""),
});

const recentSaveVisit = z.object({
  saveId: z.string(),
  visitedAt: z.number(),
});

export type RecentSaveVisit = z.infer<typeof recentSaveVisit>;

const saveRecents = z.object({
  entries: z.array(recentSaveVisit).catch([]),
});

const shortcuts = z.object({
  profile: z.enum(["pond", "eagle"]).catch("pond"),
  overrides: z.record(z.string(), z.string()).catch({}),
});

const PrefsObject = z.object({
  folderRules: z.record(z.string(), FolderRulesSchema).catch({}),
  folderViews: z.record(z.string(), FolderPresentationSchema).catch({}),
  savedViewViews: z.record(z.string(), SavedViewPresentationSchema).catch({}),
  viewer: ViewerPrefsSchema.catch(ViewerPrefsSchema.parse({})),
  shortcuts: shortcuts.catch(shortcuts.parse({})),
  preferences: preferences.catch(preferences.parse({})),
  sidebar: sidebar.catch(sidebar.parse({})),
  feedback: feedback.catch(feedback.parse({})),
  trash: trash.catch(trash.parse({})),
  window: windowSlice.catch(windowSlice.parse({})),
  system: system.catch(system.parse({})),
  quickCapture: quickCapture.catch(quickCapture.parse({})),
  autoImport: autoImport.catch(autoImport.parse({})),
  screenshots: ScreenshotPrefsSchema.catch(ScreenshotPrefsSchema.parse({})),
  tagPicker: tagPicker.catch(tagPicker.parse({})),
  search: search.catch(search.parse({})),
  allTags: allTags.catch(allTags.parse({})),
  sourcesView: sourcesView.catch(sourcesView.parse({})),
  api: api.catch(api.parse({})),
  updates: updates.catch(updates.parse({})),
  localization: localization.catch(localization.parse({})),
  sync: sync.catch(sync.parse({})),
  storage: storage.catch(storage.parse({})),
  ai: ai.catch(ai.parse({})),
  agent: agent.catch(agent.parse({})),
  saveRecents: saveRecents.catch(saveRecents.parse({})),
});

export type Prefs = z.infer<typeof PrefsObject>;

export const DEFAULT_PREFS: Prefs = PrefsObject.parse({});

export const PrefsSchema = PrefsObject.catch(DEFAULT_PREFS);

export const PrefsPatchSchema = PrefsObject.partial();

export type PrefsPatch = z.infer<typeof PrefsPatchSchema>;

export type PrefsPatchDeep = DeepPartial<Prefs>;

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export interface StoredPrefsEnvelope {
  version: number;
  app: PrefsPatchDeep;
  pending: PrefsPatchDeep | null;
}

export interface StoredPrefsEnvelopeV2 {
  version: number;
  app?: PrefsPatchDeep;
  ponds?: Record<string, PrefsPatchDeep>;
}

export type PrefsParsed = z.infer<typeof PrefsSchema>;
