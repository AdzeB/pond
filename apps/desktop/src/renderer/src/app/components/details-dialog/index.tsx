import { Dialog } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  type DetailsDialogTarget,
  detailsDialog,
  type SourceDetailsKind,
  useDetailsDialog,
} from "@/features/library";
import { SourceInspector } from "@/features/sources/components/inspector";
import styles from "./styles.module.css";

const SOURCE_DETAILS_LABELS = {
  account: "Account Details",
  watch: "Watch Details",
  folder: "Folder Details",
} satisfies Record<SourceDetailsKind, string>;

export function DetailsDialogHost() {
  const target = useDetailsDialog();
  const [shown, setShown] = useState<DetailsDialogTarget | null>(target);
  if (target && target !== shown) setShown(target);
  const onSourcesPage = useRouterState({
    select: (s) => s.location.pathname === "/sources",
  });
  useEffect(() => {
    if (!onSourcesPage) detailsDialog.close();
  }, [onSourcesPage]);

  return (
    <Dialog.Root
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) detailsDialog.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          className={styles.popup}
          aria-label={
            shown ? SOURCE_DETAILS_LABELS[shown.sourceKind] : undefined
          }
        >
          {shown ? (
            <SourceInspector
              key={shown.id}
              kind={shown.sourceKind}
              id={shown.id}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
