import type { Source } from "@pond/schema/db";
import type { MenuItemSpec } from "@pond/ui";
import React, { useState } from "react";
import type { CardModel } from "@/components/library/sources/sync-monitor/lib/helpers";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./source-tile.module.css";

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
    running && artSrc && progress != null ? (
      <img
        src={artSrc}
        alt=""
        className={styles.wipe}
        referrerPolicy="no-referrer"
        data-variant={artVariant}
        style={{ "--sources-wipe-p": progress } as React.CSSProperties}
      />
    ) : null;

  const tile = (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <span className={styles.cover}>
        <span className={styles.art} data-pulse={running ? "" : undefined}>
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
        </span>
        {pfp ? (
          <img
            width={16}
            height={16}
            src={logo ?? undefined}
            alt=""
            className={styles.badge}
          />
        ) : null}
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
