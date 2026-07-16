import {
  IconArrowUpFill18 as ArrowUp,
  IconImagePlusFill18 as ImagePlus,
} from "@pond/icons/fill/18";
import { IconClockRotateClockwiseOutline18 as History } from "@pond/icons/outline/18";
import styles from "../styles.module.css";

export function ComposerToolbar({
  onHistory,
  onPickImage,
  canSend,
  onSend,
}: {
  onHistory: () => void;
  onPickImage: () => void;
  canSend: boolean;
  onSend: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles["toolbar-group"]}>
        <button
          type="button"
          className={styles["icon-button"]}
          aria-label="Recent asks"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onHistory}
        >
          <History width={16} height={16} />
        </button>
        <button
          type="button"
          className={styles["icon-button"]}
          aria-label="Attach image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onPickImage}
        >
          <ImagePlus width={16} height={16} />
        </button>
      </div>

      <div className={styles["toolbar-group"]}>
        <button
          type="button"
          className={styles.primary}
          aria-label="Ask"
          disabled={!canSend}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSend}
        >
          <ArrowUp width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
