import { Badge } from "@pond/ui";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

export function FailedBadge({ save }: { save: Save }) {
  if (save.status !== "failed") return null;
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
