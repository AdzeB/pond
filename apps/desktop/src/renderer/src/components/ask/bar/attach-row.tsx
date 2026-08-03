import { IconXmarkOutline12 as Clear } from "@pond/icons/outline/12";
import { Button } from "@pond/ui";
import styles from "./attach-row.module.css";
import type { PendingImage } from "./lib/use-ask-submit";

export function AttachRow({
  image,
  onRemove,
}: {
  image: PendingImage;
  onRemove: () => void;
}) {
  return (
    <div className={styles["attach-row"]}>
      <span className={styles["attach-thumb"]}>
        <img src={image.url} alt="" />
      </span>
      <span className={styles["attach-label"]}>{image.name}</span>
      <Button
        icon
        size="xs"
        variant="ghost"
        aria-label="Remove image"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
      >
        <Clear />
      </Button>
    </div>
  );
}
