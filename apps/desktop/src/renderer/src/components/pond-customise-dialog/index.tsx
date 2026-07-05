import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { Button, Dialog } from "@pond/ui";
import { useMemo } from "react";
import { PondCustomiseForm } from "@/components/pond-customise-form";
import { type Pond, usePonds } from "@/hooks/use-ponds";
import {
  pondCustomise,
  usePondCustomiseOpen,
  usePondCustomiseTarget,
} from "@/stores/pond-customise";
import styles from "./styles.module.css";

export function PondCustomiseDialog() {
  const open = usePondCustomiseOpen();
  const targetPath = usePondCustomiseTarget();
  const { ponds, active } = usePonds();

  const target = useMemo(() => {
    if (targetPath) return ponds.find((p) => p.path === targetPath) ?? null;
    return active ?? null;
  }, [ponds, active, targetPath]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) pondCustomise.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open && target ? (
          <PondCustomiseContent key={target.path} pond={target} />
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PondCustomiseContent({ pond }: { pond: Pond }) {
  return (
    <Dialog.Popup className={styles.popup}>
      <header className={styles.header}>
        <Dialog.Title className={styles.title}>Edit details</Dialog.Title>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          <X />
        </Dialog.Close>
      </header>

      <PondCustomiseForm
        pond={pond}
        onSaved={pondCustomise.close}
        autoFocusName
      />
    </Dialog.Popup>
  );
}
