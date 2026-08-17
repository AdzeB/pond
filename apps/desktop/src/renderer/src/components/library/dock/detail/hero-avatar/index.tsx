import type { Source } from "@pond/schema/db";
import { useState } from "react";
import { BrandTile } from "@/components/library/sources/sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

/** Hero face for the detail cards, mirroring the sources grid tile: profile picture with a brand badge, brand tile otherwise. */
export function HeroAvatar({
  source,
  avatarUrl,
  size = 52,
  ring = false,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  size?: number;
  /** Keyline around the brand-tile fallback; watches use it, accounts do not. */
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
        className={styles["avatar-image"]}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {logo ? (
        <img
          width={16}
          height={16}
          src={logo}
          alt=""
          className={styles["avatar-badge"]}
        />
      ) : null}
    </span>
  );
}
