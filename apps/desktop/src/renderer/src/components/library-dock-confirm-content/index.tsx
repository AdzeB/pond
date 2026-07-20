import { IconTriangleWarningOutline18 as Warning } from "@pond/icons/outline/18";
import { Button, TrayCard } from "@pond/ui";
import { useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import type { ViewMenuSection } from "@/components/library-dock/lib/types";
import { dockMode } from "@/stores/dock-mode";
import styles from "./styles.module.css";

export interface TrayConfirmSpec {
  title: string;
  description: string;
  confirmLabel: string;
  /** Where Cancel returns to; null dismisses the tray. */
  returnTo: Exclude<ViewMenuSection, "confirm"> | null;
  /** Rejection keeps the card open; resolution closes the tray. */
  onConfirm: () => Promise<void> | void;
}

/** The spec is reached from several cards; module state survives the card swap, like openFrequencyPage. */
let current: TrayConfirmSpec | null = null;

export function openTrayConfirm(spec: TrayConfirmSpec): void {
  current = spec;
  dockMode.open("confirm");
}

/** Confirming clears the spec before the card swaps out; the sample keeps the exit render intact. */
const FALLBACK: TrayConfirmSpec = {
  title: "Delete Forever",
  description:
    "Deleting removes the 12 selected items and their files from your library for good. This can't be undone. Proceed carefully.",
  confirmLabel: "Delete Forever",
  returnTo: null,
  onConfirm: () => {},
};

export function ConfirmSection() {
  const dock = useDock();
  const [busy, setBusy] = useState(false);
  const spec = current ?? FALLBACK;

  const cancel = () => {
    if (spec.returnTo) dock.openViewMenu(spec.returnTo);
    else dock.closeViewMenu();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await spec.onConfirm();
      current = null;
      dock.closeViewMenu();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TrayCard.Close disabled={busy} />
      <div className={styles.body}>
        <Warning
          className={styles.mark}
          width={30}
          height={30}
          strokeWidth={1.7}
        />
        <TrayCard.Title>{spec.title}</TrayCard.Title>
        <TrayCard.Description>{spec.description}</TrayCard.Description>
      </div>
      <TrayCard.Footer>
        <Button
          variant="tertiary"
          size="lg"
          style={{ width: "100%" }}
          disabled={busy}
          onClick={cancel}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="lg"
          style={{ width: "100%" }}
          disabled={busy}
          onClick={() => void confirm()}
        >
          {spec.confirmLabel}
        </Button>
      </TrayCard.Footer>
    </>
  );
}
