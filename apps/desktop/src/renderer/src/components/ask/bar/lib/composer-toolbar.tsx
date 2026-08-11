import { IconArrowUpFill18 as ArrowUp } from "@pond/icons/fill/18";
import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import styles from "./composer-toolbar.module.css";

export function ComposerToolbar({
  onPickImage,
  canSend,
  onSend,
}: {
  onPickImage: () => void;
  canSend: boolean;
  onSend: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles["toolbar-group"]}>
        <Button
          icon
          size="xs"
          variant="ghost"
          aria-label="Attach image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onPickImage}
        >
          <Plus />
        </Button>
      </div>
      <div className={styles["toolbar-group"]}>
        <Button
          icon
          size="xs"
          variant="primary"
          className={styles.send}
          aria-label="Ask"
          disabled={!canSend}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSend}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
