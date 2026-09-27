import { IconXmarkOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import styles from "./styles.module.css";

export function FramelessWindowChrome({
  closeLabel,
  onClose,
}: {
  closeLabel: string;
  onClose(): void;
}) {
  return (
    <div className={styles.chrome}>
      <Button
        className={styles.close}
        type="button"
        icon
        size="sm"
        variant="ghost"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <IconXmarkOutline18 />
      </Button>
    </div>
  );
}
