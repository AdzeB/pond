import type { SyncAccounts } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import {
  mergePondSlice,
  normalizeStoredPrefs,
  splitPrefsPatch,
} from "./prefs-scope";

const GREEN = { appearance: "system", lightPresetId: "mint" } as const;

describe("splitPrefsPatch", () => {
  it("routes appearance (preferences) to the library slice", () => {
    const { app, pond } = splitPrefsPatch({
      preferences: { lightPresetId: "mint" },
      window: { restorePosition: false },
    });
    expect(pond).toEqual({ preferences: { lightPresetId: "mint" } });
    expect(app).toEqual({ window: { restorePosition: false } });
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
