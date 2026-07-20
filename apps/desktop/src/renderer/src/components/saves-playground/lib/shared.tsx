import { formatBytes } from "@/lib/util/format";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import type { MockSave } from "./mock";
import styles from "./shared.module.css";

export function MockThumb({
  save,
  size = 32,
}: {
  save: MockSave;
  size?: number;
}) {
  return (
    <span
      className={styles.thumb}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, oklch(0.82 0.09 ${save.hue}), oklch(0.62 0.13 ${save.hue + 40}))`,
      }}
    />
  );
}

export interface Grouped {
  failed: MockSave[];
  saving: MockSave[];
  saved: MockSave[];
}

export function groupRows(rows: MockSave[]): Grouped {
  return {
    failed: rows.filter((r) => r.status === "failed"),
    saving: rows
      .filter((r) => r.status === "saving")
      .sort((a, b) => b.progress - a.progress),
    saved: rows
      .filter((r) => r.status === "saved")
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
  };
}

export function savedMeta(save: MockSave): string {
  return [
    save.source,
    save.kind,
    save.size != null ? formatBytes(save.size) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function timeAgo(save: MockSave): string {
  return relativeTimeFromMs(save.completedAt, "");
}
