import type { Source } from "@pond/schema/db";
import { useEffect, useMemo, useState } from "react";
import type { CardModel } from "@/components/library-sync-monitor/lib/helpers";
import { formatNumber } from "@/lib/util/format";

/** Stand-in for accounts/watches so every tile state renders without touching the sync registry. */

export type TileTone = CardModel["tone"];

export interface MockTile {
  id: string;
  /** State label shown under the specimen in the stage. */
  caption: string;
  source: Source;
  avatar: string | null;
  name: string;
  /** Resting sub line: handle or source label. */
  identity: string;
  /** Status text while syncing or broken; null when resting. */
  status: string | null;
  value: string;
  tone: TileTone;
  /** 0..1 while syncing with a known total; null for indeterminate. */
  progress: number | null;
}

export interface MockGroup {
  label: string;
  tiles: MockTile[];
}

function avatar(hue: number, letter: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.84 0.08 ${hue})"/><stop offset="1" stop-color="oklch(0.56 0.13 ${hue + 40})"/></linearGradient></defs><rect width="112" height="112" fill="url(#g)"/><text x="56" y="71" font-family="-apple-system, sans-serif" font-size="42" font-weight="600" fill="rgb(255 255 255 / 88%)" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function items(count: number): string {
  return `${formatNumber(count)} item${count === 1 ? "" : "s"}`;
}

const LINUS = avatar(255, "L");
const SASHA = avatar(150, "S");
const MIRA = avatar(20, "M");
const WARM = avatar(45, "W");
const AMBIENT = avatar(210, "A");
const SLOW = avatar(320, "S");

const SYNC_TOTAL = 271;

function tile(t: MockTile): MockTile {
  return t;
}

function buildGroups(progress: number): MockGroup[] {
  const synced = Math.min(SYNC_TOTAL, Math.round(progress * SYNC_TOTAL));
  return [
    {
      label: "Accounts",
      tiles: [
        tile({
          id: "resting",
          caption: "Resting, caught up",
          source: "instagram",
          avatar: LINUS,
          name: "@linusrogge",
          identity: "Instagram",
          status: null,
          value: items(271),
          tone: "idle",
          progress: null,
        }),
        tile({
          id: "run-known",
          caption: "Syncing, known total",
          source: "instagram",
          avatar: LINUS,
          name: "@linusrogge",
          identity: "Instagram",
          status: `Syncing · ${synced}/${SYNC_TOTAL}`,
          value: items(271),
          tone: "run",
          progress,
        }),
        tile({
          id: "run-scan",
          caption: "Syncing, no total yet",
          source: "twitter",
          avatar: SASHA,
          name: "@sasha",
          identity: "Twitter",
          status: "Syncing",
          value: items(4102),
          tone: "run",
          progress: null,
        }),
        tile({
          id: "ok",
          caption: "Just synced (tone ok)",
          source: "twitter",
          avatar: SASHA,
          name: "@sasha",
          identity: "Twitter",
          status: "Synced",
          value: items(4118),
          tone: "ok",
          progress: null,
        }),
        tile({
          id: "paused",
          caption: "Session expired",
          source: "pinterest",
          avatar: MIRA,
          name: "@mira",
          identity: "Pinterest",
          status: "Session expired",
          value: items(1893),
          tone: "paused",
          progress: null,
        }),
        tile({
          id: "err",
          caption: "Sync failed",
          source: "arena",
          avatar: MIRA,
          name: "@mira",
          identity: "Are.na",
          status: "Sync failed",
          value: items(112),
          tone: "err",
          progress: null,
        }),
      ],
    },
    {
      label: "Watches",
      tiles: [
        tile({
          id: "watch-resting",
          caption: "Watch, resting",
          source: "pinterest",
          avatar: WARM,
          name: "Interior study",
          identity: "@warmminimal",
          status: null,
          value: items(1204),
          tone: "idle",
          progress: null,
        }),
        tile({
          id: "watch-run",
          caption: "Watch, checking",
          source: "youtube",
          avatar: AMBIENT,
          name: "Ambient mixes",
          identity: "YouTube Playlist",
          status: "Syncing",
          value: items(86),
          tone: "run",
          progress: null,
        }),
        tile({
          id: "watch-paused",
          caption: "Needs an account",
          source: "instagram",
          avatar: SLOW,
          name: "@slowlivingarchive",
          identity: "Instagram Profile",
          status: "Needs an account",
          value: items(340),
          tone: "paused",
          progress: null,
        }),
        tile({
          id: "watch-err",
          caption: "Check failed",
          source: "youtube",
          avatar: AMBIENT,
          name: "Ambient mixes",
          identity: "YouTube Playlist",
          status: "Check failed",
          value: items(86),
          tone: "err",
          progress: null,
        }),
      ],
    },
    {
      label: "Edge cases",
      tiles: [
        tile({
          id: "no-avatar",
          caption: "No avatar, brand tile",
          source: "pinterest",
          avatar: null,
          name: "Pinterest",
          identity: "@raphaelsalaja",
          status: null,
          value: items(3481),
          tone: "idle",
          progress: null,
        }),
        tile({
          id: "fresh",
          caption: "Fresh connect, nothing yet",
          source: "cosmos",
          avatar: null,
          name: "Cosmos",
          identity: "@raphael",
          status: null,
          value: items(0),
          tone: "idle",
          progress: null,
        }),
        tile({
          id: "single",
          caption: "Singular count",
          source: "tiktok",
          avatar: SLOW,
          name: "@slowlivingarchive",
          identity: "TikTok",
          status: null,
          value: items(1),
          tone: "idle",
          progress: null,
        }),
        tile({
          id: "overflow",
          caption: "Long name, ellipsis",
          source: "instagram",
          avatar: SLOW,
          name: "@the.slow.living.archive.studio",
          identity: "Instagram",
          status: "Session expired",
          value: items(12730),
          tone: "paused",
          progress: null,
        }),
      ],
    },
  ];
}

const TICK_MS = 120;
const TICK_STEP = 0.011;

export function useMockTiles(animate: boolean): MockGroup[] {
  const [progress, setProgress] = useState(0.42);

  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => {
      setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + TICK_STEP)));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [animate]);

  return useMemo(() => buildGroups(progress), [progress]);
}
