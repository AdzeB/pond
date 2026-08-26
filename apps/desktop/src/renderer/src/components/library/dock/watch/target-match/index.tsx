import { IconCircleCheckFill18 as MatchCheck } from "@pond/icons/fill/18";
import type { Source, WatchKind } from "@pond/schema/db";
import { BrandTile } from "@/components/library/sources/sync-monitor-source-tile";
import { watchKindLabel } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

interface WatchTargetMatchData {
  kind?: WatchKind;
  handle: string;
  display: string;
}

function matchSub(source: Source, match: WatchTargetMatchData): string {
  const handleText = /[:./]/.test(match.handle)
    ? match.handle
    : `@${match.handle}`;
  const kind = watchKindLabel(match.kind);
  return handleText === match.display
    ? `${getSourceDef(source).label} ${kind}`
    : `${handleText} · ${kind}`;
}

export function WatchTargetMatch({
  source,
  match,
}: {
  source: Source;
  match: WatchTargetMatchData;
}) {
  return (
    <div className={styles.match}>
      <span className={styles.eyebrow}>Exact match</span>
      <div className={styles.row}>
        <span className={styles.avatar}>
          <BrandTile source={source} size={32} />
        </span>
        <span className={styles.meta}>
          <span className={styles.name}>{match.display}</span>
          <span className={styles.sub}>{matchSub(source, match)}</span>
        </span>
        <MatchCheck className={styles.tick} width={18} height={18} />
      </div>
    </div>
  );
}
