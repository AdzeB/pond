import type { Source } from "@pond/schema/db";
import { useState } from "react";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile";
import { getSourceDef } from "@/features/sources/lib/registry";
import styles from "./styles.module.css";

export function HeroAvatar({
  source,
  avatarUrl,
  size = 52,
  ring = false,
  badge = true,
  badgeSize = 16,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  size?: number;
  ring?: boolean;
  badge?: boolean;
  badgeSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  const { logo, icon: Icon } = getSourceDef(source);
  const pfp = avatarUrl && !failed ? avatarUrl : null;

  if (!pfp) {
    const tile = (
      <span
        className={styles["source-image"]}
        data-large={size >= 96 || undefined}
      >
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
      {badge && (Icon || logo) ? (
        <span
          className={styles.badge}
          style={{ width: badgeSize, height: badgeSize }}
          data-large={badgeSize >= 32 || undefined}
        >
          {Icon ? (
            <Icon width={badgeSize} height={badgeSize} />
          ) : logo ? (
            <img src={logo} alt="" />
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
