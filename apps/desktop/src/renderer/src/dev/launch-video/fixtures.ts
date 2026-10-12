/** Sample library served through the fake bridge; data comes from `scripts/launch-video/collect.mjs`. */
import { DEFAULT_PREFS } from "@pond/schema";
import type { Folder, Prefs, SaveFile } from "@pond/schema/db";
import { matches } from "@pond/schema/filters/match";
import type { WirePrefsPatch, WireSave } from "@shared/wire";
import { defineQueries, emit } from "./bridge";

interface Entry {
  id: string;
  index: number;
  title: string;
  caption: string;
  ocr?: string;
  tags: string[];
  folder: string;
  source: WireSave["source"];
  sourceId: string;
  url: string;
  author: string | null;
  siteName: string | null;
  description: string | null;
  publishedAt: number | null;
  dominantColors: string[];
  savedAt: number;
  file: SaveFile;
}

const NOW = Date.UTC(2026, 9, 12, 9, 0);
const HOUR = 3_600_000;
const response = await fetch("/fixtures/library.json");
const data = (await response.json()) as {
  folders: string[];
  searches: Record<string, string[]>;
  saves: Entry[];
};

const folders: Folder[] = data.folders.map((name, i) => ({
  id: `folder-${name.toLowerCase()}`,
  parentId: null,
  name,
  color: null,
  sortOrder: i,
  createdAt: new Date(NOW - 90 * 24 * HOUR),
}));

const folderId = (name: string) => `folder-${name.toLowerCase()}`;

function toWire(entry: Entry): WireSave {
  const { savedAt } = entry;
  return {
    id: entry.id,
    source: entry.source,
    sourceId: entry.sourceId,
    accountId: null,
    url: entry.url,
    title: entry.title,
    description: entry.description,
    author: entry.author,
    lang: null,
    siteName: entry.siteName,
    publishedAt: entry.publishedAt,
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    rawJson: null,
    tags: entry.tags,
    listKinds: [],
    files: [entry.file],
    coverIndex: 0,
    width: entry.file.width ?? null,
    height: entry.file.height ?? null,
    fileSize: entry.file.size,
    container: null,
    videoCodec: null,
    audioCodec: null,
    bitrate: null,
    colorSpace: "sRGB",
    cameraMake: null,
    cameraModel: null,
    lensModel: null,
    focalLength: null,
    aperture: null,
    exposureTime: null,
    iso: null,
    takenAt: null,
    metadataVersion: 1,
    phash: null,
    blurhash: null,
    fontActivated: false,
    embeddingModel: null,
    caption: entry.caption,
    captionModel: "florence-2",
    ocrText: entry.ocr ?? null,
    ocrModel: entry.ocr ? "vision" : null,
    transcriptModel: null,
    clipModel: null,
    aesthetic: null,
    aestheticModel: null,
    sensitiveScore: null,
    sensitiveModel: null,
    autoTitleModel: null,
    suggestedTags: null,
    suggestedTagsModel: null,
    rating: null,
    rotate: 0,
    flipX: false,
    flipY: false,
    crop: null,
    dominantColors: entry.dominantColors,
    primaryColor: entry.dominantColors[0] ?? null,
    status: "complete",
    ingestStartedAt: savedAt,
    ingestCompletedAt: savedAt,
    deletedAt: null,
    savedAt,
    createdAt: savedAt,
  };
}

export const saves: WireSave[] = data.saves.map(toWire);
const entries = new Map(data.saves.map((entry) => [entry.id, entry]));

const memberships = data.saves.map((entry) => ({
  saveId: entry.id,
  folderId: folderId(entry.folder),
}));

function hasKeywords(save: WireSave, keywords: string) {
  const entry = entries.get(save.id);
  const haystack = [save.title, save.caption, save.ocrText, ...save.tags]
    .join(" ")
    .toLowerCase();
  return keywords
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(
      (word) => haystack.includes(word) || entry?.folder.toLowerCase() === word,
    );
}

/** Staged results for a scripted search; any prefix of it keeps the full library while typing. */
function searched(keywords: string) {
  const phrase = keywords.toLowerCase();
  for (const [query, ids] of Object.entries(data.searches)) {
    if (query === phrase)
      return saves
        .filter((save) => ids.includes(save.id))
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (query.startsWith(phrase)) return saves;
  }
  return saves.filter((save) => hasKeywords(save, keywords));
}

function tagList() {
  const counts = new Map<string, number>();
  for (const save of saves) {
    for (const tag of save.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts].map(([name, usageCount]) => ({
    id: `tag-${name}`,
    name,
    description: null,
    starred: false,
    archived: false,
    lastUsedAt: new Date(NOW),
    usageCount,
    createdAt: new Date(NOW - 30 * 24 * HOUR),
  }));
}

let prefs: Prefs = {
  ...structuredClone(DEFAULT_PREFS),
  agent: {
    ...DEFAULT_PREFS.agent,
    languageModel: "ollama",
    ollamaModelId: "llama3.2",
    modelIds: { ollama: "llama3.2" },
    enabledKeys: { ollama: true },
    addedProviders: ["ollama"],
  },
};

/** Merges like the main process: one level deep per top-level key. */
function applyPrefs(patch: WirePrefsPatch) {
  const next: Record<string, unknown> = { ...prefs };
  for (const [key, value] of Object.entries(patch)) {
    next[key] = { ...(next[key] as object), ...value };
  }
  prefs = next as Prefs;
  emit("onPrefsChanged", prefs);
  return prefs;
}

defineQueries({
  "settings.getPrefs": () => prefs,
  "settings.setPrefs": (patch) => ({ ok: true, prefs: applyPrefs(patch) }),
  "library.info": () => ({
    path: "/Users/you/Pond/Personal.pond",
    name: "Personal",
    icon: null,
    accent: null,
  }),
  "library.recent": () => [],
  "folders.list": () => folders,
  "folders.memberships": () => memberships,
  "saves.listBlankDocuments": () => ({ kinds: [], icons: {} }),
  "queue.summary": () => ({
    running: 0,
    waiting: 0,
    parked: 0,
    failed: 0,
    cancelled: 0,
    dead: 0,
    actionable: 0,
  }),
  "tags.list": tagList,
  "tagGroups.list": () => [],
  "savedViews.list": () => [],
  "accounts.list": () => ({ accounts: [] }),
  "saves.sidebarCounts": () => ({
    library: saves.length,
    uncategorized: 0,
    untagged: 0,
    recentlyAdded: saves.length,
    recentlyUsed: 0,
    trash: 0,
    folders: Object.fromEntries(
      folders.map((folder) => [
        folder.id,
        memberships.filter((m) => m.folderId === folder.id).length,
      ]),
    ),
  }),
  "saves.list": () => saves,
  "saves.listPage": () => ({
    rows: saves,
    nextCursor: null,
    total: saves.length,
  }),
  "saves.getMany": ({ ids }) => saves.filter((save) => ids.includes(save.id)),
  "saves.get": ({ id }) => saves.find((save) => save.id === id) ?? null,
  "saves.queryPage": (request) => {
    const folderIds = request.scope?.folderIds;
    const keywords = request.keywords?.trim();
    const ids = (keywords ? searched(keywords) : saves)
      .filter(
        (save) =>
          !folderIds ||
          memberships.some(
            (m) => m.saveId === save.id && folderIds.includes(m.folderId),
          ),
      )
      .filter((save) => !request.query || matches(request.query, save))
      .map((save) => save.id);
    return {
      ids,
      total: ids.length,
      nextCursor: null,
      libraryId: "launch-video",
      revision: 1,
    };
  },
});
