import { IconTriangleWarningOutline18 as Warning } from "@pond/icons/outline/18";
import { Button, TrayCard } from "@pond/ui";
import { useState } from "react";
import { useDock } from "@/features/library/components/dock/lib/context";
import type { ViewMenuSection } from "@/features/library/components/dock/lib/types";
import { dockMode } from "@/features/library/state/dock-mode";
import styles from "./confirm.module.css";

export interface TrayConfirmSpec {
  title: string;
  description: string;
  confirmLabel: string;
  returnTo: Exclude<ViewMenuSection, "confirm"> | null;
  onConfirm: () => Promise<void> | void;
}

let current: TrayConfirmSpec | null = null;

export function openTrayConfirm(spec: TrayConfirmSpec): void {
  current = spec;
  dockMode.open("confirm");
}

const FALLBACK: TrayConfirmSpec = {
  title: "Delete Forever",
  description:
    "Deleting removes the 12 selected items and their files from your library for good. This can't be undone.",
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
