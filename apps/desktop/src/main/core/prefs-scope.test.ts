import { PrefsSchema, type SyncAccounts } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import {
  mergeAppSlice,
  mergePondSlice,
  normalizeStoredPrefs,
  splitPrefsPatch,
} from "./prefs-scope";

const GREEN = { appearance: "system", lightPresetId: "mint" } as const;

it("loads legacy search preferences without resetting semantic search", () => {
  const prefs = PrefsSchema.parse({
    ai: { nlCompiler: true, semanticSearch: true, embedModelId: "local-model" },
  });
  expect(prefs.ai.semanticSearch).toBe(true);
  expect(prefs.ai.embedModelId).toBe("local-model");
  expect(prefs.ai).not.toHaveProperty("nlCompiler");
});

it("migrates legacy sidebar counts and completes saved destination order", () => {
  const prefs = PrefsSchema.parse({
    sidebar: {
      showCounts: false,
      order: ["trash", "all", "trash"],
    },
  });

  expect(prefs.sidebar.badgeStyle).toBe("none");
  expect(prefs.sidebar.order).toEqual([
    "trash",
    "all",
    "uncategorized",
    "untagged",
    "recentlyUsed",
    "tags",
    "random",
    "downloads",
    "sources",
  ]);
});

describe("splitPrefsPatch", () => {
  it("routes appearance (preferences) to the library slice", () => {
    const { app, pond } = splitPrefsPatch({
      preferences: { lightPresetId: "mint" },
      window: { restorePosition: false },
    });
    expect(pond).toEqual({ preferences: { lightPresetId: "mint" } });
    expect(app).toEqual({ window: { restorePosition: false } });
  });

  it("keeps the locale in the app slice", () => {
    const { app, pond } = splitPrefsPatch({
      localization: { locale: "ja" },
    });
    expect(app).toEqual({ localization: { locale: "ja" } });
    expect(pond).toEqual({});
  });

  it("keeps feedback and sidebar behavior in the app slice", () => {
    const { app, pond } = splitPrefsPatch({
      window: { interfaceZoom: 150 },
      sidebar: { showCounts: false },
      feedback: {
        sounds: { screenshot: false },
        notifications: { autoImport: false },
      },
    });
    expect(app).toMatchObject({
      window: { interfaceZoom: 150 },
      sidebar: { showCounts: false },
      feedback: {
        sounds: { screenshot: false },
        notifications: { autoImport: false },
      },
    });
    expect(pond).toEqual({});
  });
});

describe("normalizeStoredPrefs", () => {
  it("passes a v3 blob through untouched", () => {
    const stored = { version: 3 as const, app: { window: {} }, pending: null };
    expect(normalizeStoredPrefs(stored)).toBe(stored);
  });

  it("keeps the app slice and unbound entry from a v2 blob", () => {
    const stored = normalizeStoredPrefs({
      version: 2,
      app: { window: { restorePosition: false } },
      ponds: {
        unbound: { preferences: GREEN },
        "pond-a": { preferences: { lightPresetId: "ocean" } },
      },
    });
    expect(stored.version).toBe(3);
    expect(stored.app).toEqual({ window: { restorePosition: false } });
    expect(stored.pending).toEqual({ preferences: GREEN });
  });

  it("falls back to empty slices for unrecognized input", () => {
    const stored = normalizeStoredPrefs("garbage");
    expect(stored).toEqual({ version: 3, app: {}, pending: null });
  });
});

describe("mergePondSlice (sync account registry)", () => {
  const account: SyncAccounts[string] = {
    id: "01ACCOUNT",
    source: "twitter",
    handle: "personal",
    identityKey: "783214",
    label: null,
    addedAt: "2026-01-01T00:00:00.000Z",
    sync: {
      lastSyncedAt: null,
      lastError: null,
      highWaterMark: null,
      lastFullSyncAt: null,
      knownCount: 0,
      runningSince: null,
    },
  };

  it("replaces nested sync records wholesale, so the legacy drain empties them", () => {
    const base = {
      sync: {
        handles: { twitter: "personal" },
        sources: { twitter: { knownCount: 42 } },
      },
    };
    const drained = mergePondSlice(base, {
      sync: { handles: {}, sources: {} },
    });
    expect(drained.sync.handles).toEqual({});
    expect(drained.sync.sources).toEqual({});
  });

  it("keeps the account registry intact across unrelated sync patches", () => {
    const base = {
      sync: { accounts: { [account.id]: account } },
    };
    const next = mergePondSlice(base, {
      sync: { cron: { enabled: false, intervalHours: 12 } },
    });
    expect(next.sync.accounts).toEqual({ [account.id]: account });
    expect(next.sync.cron).toEqual({ enabled: false, intervalHours: 12 });
  });
});

it("persists shortcut and viewer patches while allowing overrides to be reset", () => {
  const first = mergeAppSlice(
    {},
    {
      shortcuts: { profile: "eagle", overrides: { "save.add-tag": "Alt+T" } },
      viewer: {},
    },
  );
  expect(first.shortcuts).toEqual({
    profile: "eagle",
    overrides: { "save.add-tag": "Alt+T" },
  });
  const second = mergeAppSlice(first, { shortcuts: { overrides: {} } });
  expect(second.shortcuts).toEqual({ profile: "eagle", overrides: {} });
  expect(
    splitPrefsPatch({ shortcuts: second.shortcuts }).app.shortcuts,
  ).toEqual(second.shortcuts);
});

it("keeps independent folder presentations in the portable library slice", () => {
  const first = mergePondSlice(
    {},
    {
      folderViews: {
        a: { layout: "grid", sortKey: "manual", manualOrder: ["two", "one"] },
      },
    },
  );
  const next = mergePondSlice(first, {
    folderViews: { b: { layout: "list", randomSeed: "seed-b" } },
  });
  expect(next.folderViews.a).toMatchObject({
    layout: "grid",
    sortKey: "manual",
    manualOrder: ["two", "one"],
  });
  expect(next.folderViews.b).toMatchObject({
    layout: "list",
    randomSeed: "seed-b",
  });
  const split = splitPrefsPatch({ folderViews: next.folderViews });
  expect(split.pond.folderViews).toEqual(next.folderViews);
  expect(split.app).not.toHaveProperty("folderViews");
});

it("keeps Saved View presentations in the portable library slice", () => {
  const next = mergePondSlice(
    {},
    {
      savedViewViews: {
        reading: {
          icon: "bookmark",
          color: "blue",
          quickAccess: true,
          quickAccessOrder: 0,
        },
      },
    },
  );
  expect(next.savedViewViews.reading).toEqual({
    icon: "bookmark",
    color: "blue",
    quickAccess: true,
    quickAccessOrder: 0,
  });
  const split = splitPrefsPatch({ savedViewViews: next.savedViewViews });
  expect(split.pond.savedViewViews).toEqual(next.savedViewViews);
  expect(split.app).not.toHaveProperty("savedViewViews");
});

it("keeps automatic folder rules portable and isolated to their library", () => {
  const first = mergePondSlice(
    {},
    { folderRules: { a: { automaticTags: ["Work"] } } },
  );
  const next = mergePondSlice(first, {
    folderRules: { b: { automaticTags: ["Print"] } },
  });
  expect(next.folderRules).toEqual({
    a: { automaticTags: ["Work"] },
    b: { automaticTags: ["Print"] },
  });
  const split = splitPrefsPatch({ folderRules: next.folderRules });
  expect(split.pond.folderRules).toEqual(next.folderRules);
  expect(split.app).not.toHaveProperty("folderRules");
});

it("deep-merges app feedback and sidebar destination preferences", () => {
  const next = mergeAppSlice(
    {
      feedback: {
        sounds: { screenshot: false },
        notifications: { autoImport: false },
      },
      sidebar: { destinations: { trash: false } },
    },
    {
      feedback: {
        sounds: { folderDeletion: false },
        notifications: { extensionCapture: false },
      },
      sidebar: { destinations: { sources: false } },
    },
  );

  expect(next.feedback.sounds).toMatchObject({
    screenshot: false,
    folderDeletion: false,
  });
  expect(next.feedback.notifications).toMatchObject({
    autoImport: false,
    extensionCapture: false,
  });
  expect(next.sidebar.destinations).toMatchObject({
    trash: false,
    sources: false,
  });
});
