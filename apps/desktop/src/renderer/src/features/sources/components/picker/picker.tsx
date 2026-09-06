import type { Source } from "@pond/schema/db";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile/sync-monitor-source-tile";
import { getSourceDef } from "@/features/sources/lib/registry";
import styles from "./picker.module.css";

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
          aria-label={getSourceDef(source).label}
          title={getSourceDef(source).label}
          onClick={() => onPick(source)}
        >
          <BrandTile source={source} size={48} />
        </button>
      ))}
    </div>
  );
}
