import type { Source } from "@pond/schema/db";
import type { MenuItemSpec } from "@pond/ui";
import React, { useState } from "react";
import type { CardModel } from "@/components/library/sources/sync-monitor/lib/helpers";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./source-tile.module.css";

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

export function SourceTile({
  source,
  avatarUrl,
  name,
  value,
  tone,
  progress = null,
  onOpen,
  menu,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  name: string;
  value: string;
  tone: CardModel["tone"];
  /** 0..1 while syncing with a known total; null when indeterminate or resting. */
  progress?: number | null;
  onOpen: () => void;
  menu?: () => MenuItemSpec[];
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pfp = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;
  const { logo } = getSourceDef(source);

  const warn = tone === "err" || tone === "paused";
  const running = tone === "run";

  /** Broken or in-flight artwork drains to grayscale; syncing pours color back in. */
  const drained = running || warn;
  const artSrc = pfp ?? logo ?? undefined;
  const artVariant = pfp ? "account" : "source";

  const wipe =
    running && artSrc ? (
      <img
        src={artSrc}
        alt=""
        className={styles.wipe}
        referrerPolicy="no-referrer"
        data-variant={artVariant}
        data-pulse={progress == null ? "" : undefined}
        style={
          progress != null
            ? ({ "--sources-wipe-p": progress } as React.CSSProperties)
            : undefined
        }
      />
    ) : null;

  const ring = running ? (
    <svg className={styles.ring} viewBox="0 0 64 64" aria-hidden>
      <title>Syncing</title>
      <circle cx="32" cy="32" r={RING_R} className={styles["ring-track"]} />
      <circle
        cx="32"
        cy="32"
        r={RING_R}
        className={styles["ring-arc"]}
        data-spin={progress == null ? "" : undefined}
        style={
          progress != null
            ? {
                strokeDasharray: RING_C,
                strokeDashoffset: RING_C * (1 - progress),
              }
            : undefined
        }
      />
    </svg>
  ) : null;

  const tile = (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <span className={styles.cover}>
        {pfp ? (
          <React.Fragment>
            <img
              src={pfp}
              alt=""
              className={styles.image}
              referrerPolicy="no-referrer"
              onError={() => setFailedUrl(pfp)}
              data-variant="account"
              data-drained={drained || undefined}
            />
            {wipe}
            <img
              width={16}
              height={16}
              src={logo ?? undefined}
              alt=""
              className={styles.badge}
            />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <img
              width={16}
              height={16}
              src={logo ?? undefined}
              alt=""
              className={styles.image}
              data-variant="source"
              data-drained={drained || undefined}
            />
            {wipe}
          </React.Fragment>
        )}
        {ring}
      </span>
      <span className={styles["tile-name"]}>{name}</span>
      <span
        className={styles["tile-sub"]}
        data-tone={running ? "run" : warn ? "warn" : undefined}
      >
        {value}
      </span>
    </button>
  );

  if (!menu) return tile;
  return <SpecContextMenu buildItems={menu}>{tile}</SpecContextMenu>;
}
