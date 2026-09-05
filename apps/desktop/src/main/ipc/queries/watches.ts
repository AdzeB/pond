import { z } from "zod";
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
import {
  type QueryHandlerMap,
  query,
  SourceParam,
  StringParam,
  TrimmedTextParam,
} from "./params";

export const watchesQueries = {
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

  "watches.resolve": query(
    z.object({ source: SourceParam, input: StringParam }),
    async (params) => {
      const source = params.source;
      if (!source || !isWatchableSource(source) || !params.input.trim()) {
        return { ok: false as const };
      }
      const resolved = await resolveWatchTarget(source, params.input);
      if (!resolved) return { ok: false as const };
      return { ok: true as const, target: resolved };
    },
  ),

  "watches.add": query(
    z.object({
      source: SourceParam,
      handle: StringParam,
      label: z.string().nullish().catch(null),
    }),
    async (params) => {
      const source = params.source;
      const input = params.handle;
      const label = params.label ?? null;
      if (!source || !isWatchableSource(source)) {
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
  ),

  "watches.setLabel": query(
    z.object({ watchId: StringParam, label: TrimmedTextParam }),
    async (params) => {
      const watch = await patchWatch(params.watchId, { label: params.label });
      return { ok: watch !== null, watch };
    },
  ),

  "watches.remove": query(
    z.object({ watchId: StringParam }),
    async (params) => {
      const watch = await getWatch(params.watchId);
      if (!watch) return { ok: false };
      await removeWatch(params.watchId);
      return { ok: true };
    },
  ),
} satisfies QueryHandlerMap;
