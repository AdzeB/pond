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
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  size?: number;
  ring?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const { logo } = getSourceDef(source);
  const pfp = avatarUrl && !failed ? avatarUrl : null;

  if (!pfp) {
    const tile = <BrandTile source={source} size={size} />;
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
          width={16}
          height={16}
          src={logo}
          alt=""
          className={styles.badge}
        />
      ) : null}
    </span>
  );
}
