import { PrefsSchema } from "@pond/schema";
import type { QueryName } from "@shared/query-contracts";
import type { WireJson } from "@shared/wire";
import { z } from "zod";
import type { AccountRow } from "@/features/sources/hooks/use-accounts";
import type { WatchRow } from "@/features/sources/hooks/use-watches";

import profileImage from "./assets/profile.png";

const account = {
  id: "sample-account",
  source: "youtube",
  handle: "mkbhd",
  label: "Marques Brownlee",
  avatarUrl: profileImage,
  addedAt: "2026-09-01T12:00:00Z",
  sync: {
    lastSyncedAt: "2026-09-05T12:00:00Z",
    lastError: null,
    knownCount: 128,
  },
  connected: true,
  syncing: false,
} satisfies AccountRow;

const watch = {
  id: "sample-watch",
  source: "youtube",
  handle: "designnotes",
  kind: "channel",
  label: "Design Notes",
  avatarUrl: null,
  via: null,
  addedAt: "2026-09-01T12:00:00Z",
  sync: {
    lastSyncedAt: "2026-09-05T12:00:00Z",
    lastError: null,
    knownCount: 42,
  },
  syncing: false,
} satisfies WatchRow;

const LookupInput = z.object({ source: z.string(), input: z.string() });

export function installFixtures(connectionFailed: boolean) {
  let failed = connectionFailed;
  if (window.pond)
    throw new Error("Open this gallery in a browser, outside the desktop app.");
  const prefs = PrefsSchema.parse({ preferences: { soundsEnabled: false } });
  const bridge = {
    async query(name: QueryName, params?: WireJson) {
      switch (name) {
        case "accounts.list":
          return { accounts: [account] };
        case "watches.list":
          return { watches: [watch] };
        case "settings.getPrefs":
          return prefs;
        case "sync.history":
          return { runs: [] };
        case "watches.resolve": {
          const { source, input } = LookupInput.parse(params);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (input.toLowerCase().includes("empty")) return { ok: false };
          if (input.toLowerCase().includes("error"))
            throw new Error("Sample lookup failed");
          if (!["youtube", "tiktok", "twitter"].includes(source))
            return { ok: false };
          return {
            ok: true,
            target: {
              handle: input.replace(/^@/, ""),
              display: "Alex Morgan",
              kind: source === "youtube" ? "channel" : "user",
            },
          };
        }
        case "watches.add":
          return { ok: true, watch: { id: watch.id } };
        case "accounts.setLabel":
        case "accounts.setHandle":
        case "accounts.disconnect":
        case "watches.setLabel":
        case "watches.remove":
          return { ok: true };
        default:
          throw new Error(`No gallery fixture for ${name}`);
      }
    },
    async connectSource() {
      return { ok: !failed, mode: "external" };
    },
    async clearPendingSession() {
      return { ok: true };
    },
    async syncRunNow() {
      return { ok: true };
    },
    async syncCancel() {
      return { ok: true, running: false };
    },
    async refreshBackfillStart() {
      return { ok: true, total: 128 };
    },
    async openExternal() {
      return { ok: true };
    },
    async tx() {},
  };
  Object.defineProperty(window, "pond", { value: bridge, configurable: true });
  return {
    setConnectionFailed(next: boolean) {
      failed = next;
    },
  };
}
