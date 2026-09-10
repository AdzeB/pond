import {
  formatListDimension,
  formatListExtension,
  formatListRating,
  useListColumns,
} from "@/features/library/state/list-columns";
import { PreparedCardThumb } from "@/features/saves/components/card/media/media";
import { Card } from "@/features/saves/components/card/parts/parts";
import type { SaveCardViewProps } from "@/features/saves/components/card/views/types";
import { formatAbsolute, formatBytes } from "@/shared/lib/format";
import styles from "./list.module.css";

export function ListCard({ model, width }: SaveCardViewProps) {
  const columns = useListColumns();
  const save = model.save;
  const file = model.primary;
  return (
    <div className={styles.body}>
      <Card.Media className={styles.media}>
        <Card.Frame>
          <PreparedCardThumb
            save={save}
            view="list"
            width={width}
            mediaUnits={model.mediaUnits}
            pickOptions={model.pickOptions}
            unit={model.unit}
            primary={model.primary}
          />
        </Card.Frame>
        <Card.Overlay model={model.overlay} />
      </Card.Media>
      {columns.name ? (
        <Card.Meta className={styles.meta} title={save.title ?? save.url} />
      ) : null}
      {columns.tags ? (
        <span className={styles.cell}>{save.tags.join(", ") || "—"}</span>
      ) : null}
      {columns.dimensions ? (
        <span className={styles.cell}>
          {formatListDimension(save.width, save.height)}
        </span>
      ) : null}
      {columns.rating ? (
        <span className={styles.cell}>{formatListRating(save.rating)}</span>
      ) : null}
      {columns.extension ? (
        <span className={styles.cell}>{formatListExtension(file?.path)}</span>
      ) : null}
      {columns.fileSize ? (
        <span className={styles.cell}>{formatBytes(save.fileSize)}</span>
      ) : null}
      {columns.dateAdded ? (
        <span className={styles.cell}>
          {formatAbsolute(save.savedAt) || "—"}
        </span>
      ) : null}
      {columns.annotation ? (
        <span className={styles.cell}>
          {save.notes?.trim() || (save.comments?.length ?? 0) > 0 ? "Yes" : "—"}
        </span>
      ) : null}
    </div>
  );
}
