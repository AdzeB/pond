import { Badge } from "@pond/ui";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

export function DownloadingBadge({
  save,
  isDownloading,
}: {
  save: Save;
  isDownloading: boolean;
}) {
  if (save.status === "failed") {
    const lastError =
      save.tasks?.find((t) => t.status === "dead" || t.status === "blocked")
        ?.lastError ?? "Failed";
    return (
      <Badge
        tone="negative"
        className={styles.badge}
        role="status"
        aria-label="Ingest failed"
        title={lastError}
      >
        Failed
      </Badge>
    );
  }
  if (!isDownloading) return null;
  return (
    <Badge
      tone="inverted"
      className={styles.badge}
      role="status"
      aria-label="Downloading video"
      title="Downloading video"
    >
      <Badge.Dot tone="positive" className={styles.dot} />
      Downloading
    </Badge>
  );
}
