import { Button, Dialog } from "@pond/ui";
import { useState } from "react";
import styles from "./styles.module.css";

const KEY = "pond:onboarding:2026";
const steps = [
  {
    title: "Your Library",
    description:
      "Import files, folders, or links. Pond keeps your library on this Mac.",
  },
  {
    title: "Preview and Navigate",
    description:
      "Press Space to preview a Save. Use your mouse wheel to scroll, zoom, or navigate based on Viewer settings.",
  },
  {
    title: "Enrichment Stays Local",
    description:
      "On-device enrichments run on this Mac. Agent features use your configured provider or local host.",
  },
] as const;

function firstRun(): boolean {
  try {
    return localStorage.getItem(KEY) !== "complete";
  } catch {
    return false;
  }
}

export function Onboarding() {
  const [open, setOpen] = useState(firstRun);
  const [index, setIndex] = useState(0);
  const step = steps[index] ?? steps[0];
  const finish = () => {
    try {
      localStorage.setItem(KEY, "complete");
    } catch {}
    setOpen(false);
  };
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && finish()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>{step.title}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>{step.description}</Dialog.Description>
          <p className={styles.progress}>{`${index + 1} of ${steps.length}`}</p>
          <Dialog.Footer>
            {index > 0 ? (
              <Button variant="secondary" onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            ) : null}
            {index < steps.length - 1 ? (
              <Button onClick={() => setIndex(index + 1)}>Continue</Button>
            ) : (
              <Button onClick={finish}>Get Started</Button>
            )}
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
