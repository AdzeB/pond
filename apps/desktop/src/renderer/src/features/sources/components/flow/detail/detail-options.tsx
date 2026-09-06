import { Button, Dialog } from "@pond/ui";
import styles from "./detail.module.css";

export function DetailOptions({
  onRemove,
  removeLabel,
}: {
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className={styles.rows}>
      <Dialog.Footer className={styles.footer}>
        <Button variant="tertiary" size="lg" width="full" onClick={onRemove}>
          {removeLabel}
        </Button>
      </Dialog.Footer>
    </div>
  );
}
