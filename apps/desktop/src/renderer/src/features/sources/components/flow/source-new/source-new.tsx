import { IconEyeOutline18, IconLink2Outline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { sourceFlow } from "@/features/sources/state/source-flow";
import styles from "./source-new.module.css";

export function SourceNewSection() {
  return (
    <div className={styles.rows}>
      <Button
        variant="ghost"
        size="xl"
        width="full"
        className={styles.row}
        onClick={() => sourceFlow.push("connect-source")}
      >
        <span className={styles.icon}>
          <IconLink2Outline18 aria-hidden />
        </span>
        <span className={styles.copy}>
          <span className={styles.label}>Link</span>
          <span className={styles.description}>Sync your saved posts.</span>
        </span>
      </Button>
      <Button
        variant="ghost"
        size="xl"
        width="full"
        className={styles.row}
        onClick={() => sourceFlow.push("watch-target")}
      >
        <span className={styles.icon}>
          <IconEyeOutline18 aria-hidden />
        </span>
        <span className={styles.copy}>
          <span className={styles.label}>Follow</span>
          <span className={styles.description}>Collect new public posts.</span>
        </span>
      </Button>
    </div>
  );
}
