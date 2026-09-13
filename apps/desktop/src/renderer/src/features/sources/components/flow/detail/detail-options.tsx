import { Button, Dialog } from "@pond/ui";
import { useState } from "react";
import styles from "./detail.module.css";

export function DetailOptions({
  onRemove,
  removeLabel,
  description,
}: {
  onRemove: () => void | Promise<void>;
  removeLabel: string;
  description: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Dialog.Description>{description}</Dialog.Description>
      <Dialog.Footer className={styles.footer}>
        <Button
          variant="destructive"
          size="lg"
          width="full"
          disabled={busy}
          loading={busy}
          onClick={() => {
            if (busy) return;
            setBusy(true);
            void Promise.resolve(onRemove()).catch(() => {
              setBusy(false);
            });
          }}
        >
          {removeLabel}
        </Button>
      </Dialog.Footer>
    </>
  );
}
