import type { Source } from "@pond/schema/db";
import { ClippedScroll } from "@/components/clipped-scroll";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

/** The row list shared by the tray's connect and watch pickers. */
export function SourcePicker({
  sources,
  onPick,
}: {
  sources: readonly Source[];
  onPick: (source: Source) => void;
}) {
  if (sources.length === 0) {
    return (
      <p className={styles.empty}>No source found — try a different name.</p>
    );
  }
  return (
    <ClippedScroll maxHeight={320} className={styles.list}>
      {sources.map((source) => (
        <button
          key={source}
          type="button"
          className={styles.row}
          onClick={() => onPick(source)}
        >
          <BrandTile source={source} size={24} />
          <span className={styles.name}>{getSourceDef(source).label}</span>
        </button>
      ))}
    </ClippedScroll>
  );
}
