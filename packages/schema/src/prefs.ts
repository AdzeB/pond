import { z } from "zod";
import { AI_PROVIDER_IDS } from "./ai-providers";
import {
  CUSTOM_THEME_DEFAULT,
  type DashboardConfig,
  DEFAULT_DASHBOARDS,
  DEFAULT_PRESET_ID,
  DEFAULT_SOURCE_METRICS,
  DEFAULT_SYSTEM_DARK_ID,
  DEFAULT_SYSTEM_LIGHT_ID,
  type SourceMetricDisplay,
  type SyncAccounts,
  type SyncHandles,
  type SyncSources,
  type SyncWatches,
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
  /** "media" prefers attached media; "screenshot" always renders the card. */
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
  /** "continue" restores the last route; the others jump to a fixed page. */
  startupPage: z
    .enum(["continue", "library", "sources", "trash", "settings"])
    .catch("continue"),
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

/** `activeId` remembers the last-open dashboard. */
const analyticsView = z.object({
  dashboards: z.custom<DashboardConfig[]>().default(DEFAULT_DASHBOARDS),
  activeId: z.string().catch("default-overview"),
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
  verboseLogging: z.boolean().catch(false),
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
 * `provider` selects where the LLM stage runs; embeddings always run on-device in the renderer via Transformers.js.
 * A custom endpoint's API key is stored in the OS keychain, never here.
 */
const ai = z.object({
  /** Natural-language -> structured-query compiler LLM stage. */
  nlCompiler: z.boolean().catch(false),
  /**
   * Multi-step agentic loop; falls back to single-shot plan compile when off or the model can't drive it.
   * @see modelSupportsAgent
   */
  agent: z.boolean().catch(false),
  /** Hard cap on agent reasoning steps per turn; bounds latency and token spend. */
  agentMaxSteps: z.number().catch(5),
  /** On-device embeddings plus semantic ranking of free-text search. */
  semanticSearch: z.boolean().catch(false),
  /**
   * "bundled" runs node-llama-cpp GGUF in the main process; local servers and hosted vendors speak OpenAI-compatible HTTP.
   * @see AI_PROVIDERS
   */
  provider: z.enum(AI_PROVIDER_IDS).catch("ollama"),
  /** Base URL override for HTTP providers; empty means the provider's default. */
  endpoint: z.string().catch(""),
  /** Provider-specific chat/completion model id for the LLM stage. */
  modelId: z.string().catch(""),
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

/** Named slash shortcut that runs a saved prompt through the Ask flow; `name` is the slash token without the leading slash, `id` its stable slug. */
const customSkill = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().catch(""),
  prompt: z.string(),
});

export type CustomSkill = z.infer<typeof customSkill>;

/**
 * Starter skills so a new library isn't an empty composer; each prompt is phrased to resolve through the deterministic NL compiler.
 * Stable ids keep them de-duplicated across reloads; the seed only fills an absent skills slice, so deletions persist.
 */
export const DEFAULT_SKILLS: CustomSkill[] = [
  {
    id: "default-untagged",
    name: "untagged",
    description: "Saves you haven't labelled yet",
    prompt: "untagged",
  },
  {
    id: "default-recent",
    name: "recent",
    description: "Saved in the last week",
    prompt: "saved this week, newest first",
  },
  {
    id: "default-videos",
    name: "videos",
    description: "Just your videos",
    prompt: "videos",
  },
  {
    id: "default-images",
    name: "images",
    description: "Just your images",
    prompt: "images",
  },
  {
    id: "default-galleries",
    name: "galleries",
    description: "Posts with multiple images",
    prompt: "multiple images",
  },
];

const skills = z.object({
  custom: z.array(customSkill).catch([]),
  /**
   * One-shot marker: false until the starter skills have been merged in once.
   * Never re-seeded after it flips true, so deletions stay sticky.
   */
  seeded: z.boolean().catch(false),
});

/** Most-recent-first; pond-scoped so questions typed in one library never surface in another. */
const askHistory = z.object({
  entries: z.array(z.string()).catch([]),
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
  analyticsView: analyticsView.catch(analyticsView.parse({})),
  api: api.catch(api.parse({})),
  updates: updates.catch(updates.parse({})),
  developer: developer.catch(developer.parse({})),
  sync: sync.catch(sync.parse({})),
  storage: storage.catch(storage.parse({})),
  ai: ai.catch(ai.parse({})),
  skills: skills.catch(skills.parse({})),
  askHistory: askHistory.catch(askHistory.parse({})),
  saveRecents: saveRecents.catch(saveRecents.parse({})),
});

export type Prefs = z.infer<typeof PrefsObject>;

export const DEFAULT_PREFS: Prefs = PrefsObject.parse({});

/** Top-level catch keeps parsing non-throwing for wholly corrupt input. */
export const PrefsSchema = PrefsObject.catch(DEFAULT_PREFS);

export type PrefsParsed = z.infer<typeof PrefsSchema>;
