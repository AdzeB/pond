import type { Source } from "@pond/schema/db";
import { BrandTile } from "@/components/library/sources/sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

/** The brand grid shared by the tray's connect and watch pickers. */
export function SourcePicker({
  sources,
  onPick,
}: {
  sources: readonly Source[];
  onPick: (source: Source) => void;
}) {
  return (
    <div className={styles.grid}>
      {sources.map((source) => (
        <button
          key={source}
          type="button"
          className={styles.cell}
          onClick={() => onPick(source)}
        >
          <BrandTile source={source} size={40} />
          <span className={styles.name}>{getSourceDef(source).label}</span>
        </button>
      ))}
    </div>
  );
}
