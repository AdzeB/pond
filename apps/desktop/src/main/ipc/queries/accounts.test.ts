import type { ConnectedAccount } from "@pond/schema/db";
import { describe, expect, it, vi } from "vitest";
import {
  createImportOptionsQuery,
  createSetImportScopeQuery,
  createSetSyncLikesQuery,
} from "./accounts";

function account(source: ConnectedAccount["source"]): ConnectedAccount {
  return {
    id: `${source}:123`,
    source,
    handle: "raphael",
    identityKey: "123",
    label: null,
    addedAt: "2026-10-15T00:00:00.000Z",
    sync: {
      lastSyncedAt: null,
      lastError: null,
      highWaterMark: null,
      lastFullSyncAt: null,
      knownCount: 0,
      runningSince: null,
    },
  };
}

describe("accounts.setSyncLikes", () => {
  it("persists the preference for an X account", async () => {
    const patchAccountSync = vi.fn(async () => account("twitter").sync);
    const operation = createSetSyncLikesQuery({
      getAccount: vi.fn(async () => account("twitter")),
      patchAccountSync,
    });

    await expect(
      operation({ accountId: "twitter:123", syncLikes: false }),
    ).resolves.toEqual({ ok: true });
    expect(patchAccountSync).toHaveBeenCalledWith("twitter:123", {
      syncLikes: false,
    });
  });

  it("rejects unsupported account sources without writing", async () => {
    const patchAccountSync = vi.fn(async () => account("instagram").sync);
    const operation = createSetSyncLikesQuery({
      getAccount: vi.fn(async () => account("instagram")),
      patchAccountSync,
    });

    await expect(
      operation({ accountId: "instagram:123", syncLikes: false }),
    ).resolves.toEqual({
      ok: false,
      error: "Syncing Likes is only available for X accounts.",
    });
    expect(patchAccountSync).not.toHaveBeenCalled();
  });

  it("rejects malformed input at the query boundary", () => {
    const operation = createSetSyncLikesQuery({
      getAccount: vi.fn(),
      patchAccountSync: vi.fn(),
    });

    expect(() => operation({ accountId: "", syncLikes: false })).toThrow();
    expect(() =>
      operation.inputSchema.parse({
        accountId: "twitter:123",
        syncLikes: "false",
      }),
    ).toThrow();
  });

  it("propagates persistence failures", async () => {
    const failure = new Error("write failed");
    const operation = createSetSyncLikesQuery({
      getAccount: vi.fn(async () => account("twitter")),
      patchAccountSync: vi.fn(async () => {
        throw failure;
      }),
    });

    await expect(
      operation({ accountId: "twitter:123", syncLikes: true }),
    ).rejects.toBe(failure);
  });
});

describe("accounts.setImportScope", () => {
  it("confirms a pending Account with the chosen boards", async () => {
    const pending = account("pinterest");
    pending.sync.importPending = true;
    const patchAccountSync = vi.fn(async () => pending.sync);
    const operation = createSetImportScopeQuery({
      getAccount: vi.fn(async () => pending),
      patchAccountSync,
    });

    await expect(
      operation({
        accountId: "pinterest:123",
        scope: { collections: [{ id: "915", name: "Design References" }] },
      }),
    ).resolves.toEqual({ ok: true });
    expect(patchAccountSync).toHaveBeenCalledWith("pinterest:123", {
      importScope: {
        collections: [{ id: "915", name: "Design References" }],
      },
      importPending: false,
      lastFullSyncAt: null,
      resumeCursor: null,
    });
  });

  it("stores everything for options the Source can't honor", async () => {
    const patchAccountSync = vi.fn(async () => account("twitter").sync);
    const operation = createSetImportScopeQuery({
      getAccount: vi.fn(async () => account("twitter")),
      patchAccountSync,
    });

    await operation({
      accountId: "twitter:123",
      scope: { listKinds: ["saved"] },
    });
    expect(patchAccountSync).toHaveBeenCalledWith("twitter:123", {
      importScope: undefined,
      importPending: false,
    });
  });

  it("rejects a scope that would import nothing without writing", async () => {
    const patchAccountSync = vi.fn(async () => account("instagram").sync);
    const operation = createSetImportScopeQuery({
      getAccount: vi.fn(async () => account("instagram")),
      patchAccountSync,
    });

    await expect(
      operation({ accountId: "instagram:123", scope: { listKinds: [] } }),
    ).resolves.toEqual({
      ok: false,
      error: "Choose at least one list to import.",
    });
    expect(patchAccountSync).not.toHaveBeenCalled();
  });

  it("rejects unknown lists at the query boundary", () => {
    const operation = createSetImportScopeQuery({
      getAccount: vi.fn(),
      patchAccountSync: vi.fn(),
    });
    expect(() =>
      operation.inputSchema.parse({
        accountId: "instagram:123",
        scope: { listKinds: ["reposted"] },
      }),
    ).toThrow();
  });
});

describe("accounts.importOptions", () => {
  it("returns no collections for Sources that import everything", async () => {
    const listSourceCollections = vi.fn();
    const operation = createImportOptionsQuery({
      getAccount: vi.fn(async () => account("instagram")),
      resolveAccountHandle: vi.fn(async () => "raphael"),
      listSourceCollections,
    });

    await expect(operation({ accountId: "instagram:123" })).resolves.toEqual({
      ok: true,
      collections: null,
    });
    expect(listSourceCollections).not.toHaveBeenCalled();
  });

  it("lists Pinterest boards through the Account's session", async () => {
    const listSourceCollections = vi.fn(async () => ({
      ok: true as const,
      collections: [{ id: "915", name: "Design References", itemCount: 42 }],
    }));
    const operation = createImportOptionsQuery({
      getAccount: vi.fn(async () => account("pinterest")),
      resolveAccountHandle: vi.fn(async () => "raphael"),
      listSourceCollections,
    });

    await expect(operation({ accountId: "pinterest:123" })).resolves.toEqual({
      ok: true,
      collections: [{ id: "915", name: "Design References", itemCount: 42 }],
    });
    expect(listSourceCollections).toHaveBeenCalledWith("pinterest", {
      partition: "persist:pond-acct-pinterest:123",
      accountKey: "raphael",
    });
  });

  it("explains a signed-out session", async () => {
    const operation = createImportOptionsQuery({
      getAccount: vi.fn(async () => account("pinterest")),
      resolveAccountHandle: vi.fn(async () => "raphael"),
      listSourceCollections: vi.fn(async () => ({
        ok: false as const,
        reason: "auth_required" as const,
      })),
    });

    await expect(operation({ accountId: "pinterest:123" })).resolves.toEqual({
      ok: false,
      error:
        "Pinterest signed you out. Reconnect the Account to load your boards.",
    });
  });
});
