import {
  IconArrowUpFill18 as ArrowUp,
  IconImagePlusFill18 as ImagePlus,
} from "@pond/icons/fill/18";
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
      <div className={styles["toolbar-group"]} />
      <div className={styles["toolbar-group"]}>
        <Button
          icon
          size="xs"
          variant="ghost"
          aria-label="Attach image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onPickImage}
        >
          <ImagePlus />
        </Button>
        <Button
          icon
          size="xs"
          variant="accent"
          className={styles.primary}
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
