import type { MenuItemSpec } from "@pond/ui";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { CardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import type { AccountRow } from "@/features/sources/hooks/use-accounts";
import type { WatchRow } from "@/features/sources/hooks/use-watches";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import { toSourceTableRow } from "./helpers";
import { buildSourceMenu, contextMenuSources } from "./menu";

function visibleLabels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    if (item.type === "submenu" || item.type === "group") {
      const label =
        "label" in item ? z.string().array().catch([]).parse([item.label]) : [];
      return [...label, ...visibleLabels(item.items)];
    }
    if ("label" in item)
      return z.string().array().catch([]).parse([item.label]);
    return [];
  });
}

const ready: CardModel = {
  tone: "ok",
  statusText: "Synced",
  connected: true,
  meta: "Manual",
  lastText: "3 minutes ago",
};

const running: CardModel = {
  ...ready,
  tone: "run",
  statusText: "Syncing",
  lastText: "now",
};

function account(id: string) {
  const row: AccountRow = {
    id,
    source: "instagram",
    handle: "oluwa.rafa",
    label: null,
    avatarUrl: null,
    addedAt: "",
    sync: { lastSyncedAt: null, lastError: null, knownCount: 4224 },
    connected: true,
    syncing: false,
  };
  return toSourceTableRow({ kind: "account", row }, ready);
}

function watch(id: string) {
  const row: WatchRow = {
    id,
    source: "twitter",
    handle: "raphaelsalaja",
    kind: "list",
    label: null,
    avatarUrl: null,
    via: null,
    addedAt: "",
    sync: { lastSyncedAt: null, lastError: null, knownCount: 8 },
    syncing: false,
  };
  return toSourceTableRow({ kind: "watch", row }, ready);
}

afterEach(() => {
  sourcesSelection.clear();
});

describe("contextMenuSources", () => {
  it("uses the whole selection when the clicked source is already selected", () => {
    const first = account("first");
    const second = account("second");
    sourcesSelection.set([first, second]);
    expect(contextMenuSources(first).map((row) => row.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("uses only the clicked source when it is not in the selection", () => {
    const first = account("first");
    const second = account("second");
    sourcesSelection.set([second]);
    expect(contextMenuSources(first).map((row) => row.id)).toEqual(["first"]);
  });
});

describe("buildSourceMenu", () => {
  it("shows account actions for a single account", () => {
    expect(visibleLabels(buildSourceMenu(account("acc")))).toEqual([
      "Sync Now",
      "View Items in Library",
      "Backfill",
      "Refresh Metadata",
      "Download Full Quality",
    ]);
  });

  it("shows Check Now for a watched source", () => {
    expect(visibleLabels(buildSourceMenu(watch("watch")))).toEqual([
      "Check Now",
      "View Items in Library",
    ]);
  });

  it("keeps Sync Now for a mixed selection and drops account-only actions", () => {
    expect(
      visibleLabels(buildSourceMenu([account("acc"), watch("watch")])),
    ).toEqual(["Sync Now", "View Items in Library"]);
  });

  it("shows Check Now for a watched-only selection", () => {
    expect(
      visibleLabels(buildSourceMenu([watch("one"), watch("two")])),
    ).toEqual(["Check Now", "View Items in Library"]);
  });

  it("disables Sync Now when none of the selection can sync", () => {
    const row = toSourceTableRow(account("busy").entry, running);
    expect(buildSourceMenu(row)[0]).toMatchObject({
      label: "Sync Now",
      disabled: true,
    });
  });
});
