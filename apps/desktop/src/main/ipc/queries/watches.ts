import type { Source } from "@pond/schema/db";
import { isSyncing } from "../../core/sync";
import { listAccountsForSource } from "../../core/sync/accounts";
import { fillMissingAvatars } from "../../core/sync/avatars";
import {
  createWatch,
  findWatchByHandle,
  getWatch,
  listWatches,
  patchWatch,
  removeWatch,
} from "../../core/sync/watches";
import { resolveWatchTarget } from "../../core/watch/resolve";
import { watchNow } from "../../core/watch/run";
import { isWatchableSource, WATCH_NEEDS_SESSION } from "../../core/watch/types";
import type { QueryHandlerMap } from "../helpers";

export const watchesQueries: QueryHandlerMap = {
  async "watches.list"() {
    fillMissingAvatars();
    const watches = await listWatches();
    return {
      watches: watches.map((watch) => ({
        ...watch,
        syncing: isSyncing(watch.id),
      })),
    };
  },

  async "watches.resolve"(params) {
    const source = String(params.source ?? "") as Source;
    const input = String(params.input ?? "");
    if (!isWatchableSource(source) || !input.trim()) {
      return { ok: false as const };
    }
    const resolved = await resolveWatchTarget(source, input);
    if (!resolved) return { ok: false as const };
    return { ok: true as const, target: resolved };
  },

  async "watches.add"(params) {
    const source = String(params.source ?? "") as Source;
    const input = String(params.handle ?? "");
    const label = typeof params.label === "string" ? params.label : null;
    if (!isWatchableSource(source)) {
      return { ok: false as const, reason: "unsupported" as const };
    }
    const resolved = await resolveWatchTarget(source, input);
    if (!resolved) {
      return { ok: false as const, reason: "invalid" as const };
    }
    const existing = await findWatchByHandle(
      source,
      resolved.handle,
      resolved.kind,
    );
    if (existing) {
      return { ok: false as const, reason: "already_watching" as const };
    }
    let via: string | null = null;
    if (WATCH_NEEDS_SESSION.includes(source)) {
      const accounts = await listAccountsForSource(source);
      const first = accounts[0];
      if (!first) {
        return { ok: false as const, reason: "needs_account" as const };
      }
      via = first.id;
    }
    const watch = await createWatch({
      source,
      handle: resolved.handle,
      kind: resolved.kind,
      label,
      via,
    });
    void watchNow(watch.id, { trigger: "manual" });
    return { ok: true as const, watch };
  },

  async "watches.setLabel"(params) {
    const watchId = String(params.watchId ?? "");
    const raw = params.label;
    const label =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    const watch = await patchWatch(watchId, { label });
    return { ok: watch !== null, watch };
  },

  async "watches.remove"(params) {
    const watchId = String(params.watchId ?? "");
    const watch = await getWatch(watchId);
    if (!watch) return { ok: false };
    await removeWatch(watchId);
    return { ok: true };
  },
};
