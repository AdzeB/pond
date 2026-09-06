import type { Source } from "@pond/schema/db";
import { useState } from "react";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile/sync-monitor-source-tile";
import { getSourceDef } from "@/features/sources/lib/registry";
import styles from "./hero-avatar.module.css";

export function HeroAvatar({
  source,
  avatarUrl,
  size = 52,
  ring = false,
  badgeSize = 16,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  size?: number;
  ring?: boolean;
  badgeSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  const { logo } = getSourceDef(source);
  const pfp = avatarUrl && !failed ? avatarUrl : null;

  if (!pfp) {
    const tile = (
      <span className={styles.sourceImage} data-large={size >= 96 || undefined}>
        <BrandTile source={source} size={size} />
      </span>
    );
    if (!ring) return tile;
    return <span className={styles.wavatar}>{tile}</span>;
  }

  return (
    <span className={styles.avatar} style={{ width: size, height: size }}>
      <img
        src={pfp}
        alt=""
        className={styles.image}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {logo ? (
        <img
          width={badgeSize}
          height={badgeSize}
          src={logo}
          alt=""
          className={styles.badge}
          data-large={badgeSize >= 32 || undefined}
        />
      ) : null}
    </span>
  );
}
