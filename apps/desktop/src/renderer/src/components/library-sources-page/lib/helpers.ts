import {
  type CardModel,
  cardModel,
} from "@/components/library-sync-monitor/lib/helpers";
import type { AccountRow } from "@/hooks/use-accounts";
import { type WatchRow, watchKindLabel } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { formatNumber } from "@/lib/util/format";
import type { SyncAccountStatus } from "@/stores/sync-monitor";

/** The global background-sync cadence, surfaced per-account; it applies to all. */
export const FREQUENCY_OPTIONS = [
  { hours: 1, label: "Every hour" },
  { hours: 2, label: "Every 2 hours" },
  { hours: 6, label: "Every 6 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Once a day" },
] as const;

export function accountName(account: AccountRow): string {
  const suffix = account.label ?? (account.handle ? `@${account.handle}` : "");
  const label = getSourceDef(account.source).label;
  return suffix ? `${label} · ${suffix}` : label;
}

export function watchName(watch: WatchRow): string {
  if (watch.label) return watch.label;
  /** Playlist/list ids are opaque tokens, not handles, so no @ prefix. */
  return watch.kind === "playlist" || watch.kind === "list"
    ? watch.handle
    : `@${watch.handle}`;
}

export function accountSub(account: AccountRow, model: CardModel): string {
  if (model.tone === "run") return model.statusText;
  if (model.tone === "paused") return "Session expired";
  if (model.tone === "err") return "Sync failed";
  const count = account.sync?.knownCount ?? 0;
  return [
    /** The name line is the platform label unless nicknamed, so only lead with the handle when there is one. */
    account.handle ? `@${account.handle}` : null,
    `${formatNumber(count)} item${count === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function watchSub(watch: WatchRow, model: CardModel): string {
  if (model.tone === "run") return model.statusText;
  if (model.tone === "paused") return "Needs an account";
  if (model.tone === "err") return "Check failed";
  /** The name line already carries the handle, so the sub leads with the platform and the kind of thing being watched. */
  const def = getSourceDef(watch.source);
  const platformLine = watch.label
    ? watchName({ ...watch, label: null })
    : watch.kind && watch.kind !== "user"
      ? `${def.label} ${watchKindLabel(watch.kind)}`
      : def.label;
  const count = watch.sync?.knownCount ?? 0;
  return `${platformLine} · ${formatNumber(count)} item${count === 1 ? "" : "s"}`;
}

export function healthLine(
  accounts: readonly AccountRow[],
  watches: readonly WatchRow[],
  byAccount: Record<string, SyncAccountStatus>,
): string {
  if (accounts.length === 0 && watches.length === 0) {
    return "Nothing connected yet — add a source to start collecting.";
  }
  const sources = new Set(accounts.map((a) => a.source));
  const all = [...accounts, ...watches];
  const running = all.filter(
    (a) => byAccount[a.id]?.state === "running",
  ).length;
  const broken = all.filter((a) => {
    const tone = cardModel(byAccount[a.id]).tone;
    return tone === "err" || tone === "paused";
  }).length;
  const parts = [
    `${accounts.length} account${accounts.length === 1 ? "" : "s"}`,
    ...(watches.length > 0
      ? [`watching ${watches.length}`]
      : [`${sources.size} source${sources.size === 1 ? "" : "s"}`]),
    broken > 0
      ? `${broken} need${broken === 1 ? "s" : ""} attention`
      : running > 0
        ? `syncing ${running}`
        : "all healthy",
  ];
  return parts.join(" · ");
}
