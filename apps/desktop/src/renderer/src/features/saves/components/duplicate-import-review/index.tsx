import { Button, Checkbox, Dialog } from "@pond/ui";
import type { DuplicateImportChoice } from "@shared/saves-import-contracts";
import { useState } from "react";
import {
  closeDuplicateImportReview,
  completeDuplicateImportReview,
  useDuplicateImportReview,
} from "@/features/saves/state/duplicate-import-review";
import { useRetainedDialogPayload } from "@/shared/hooks/use-retained-dialog-payload";
import styles from "./styles.module.css";

export function DuplicateImportReviewHost() {
  const request = useDuplicateImportReview();
  const presentation = useRetainedDialogPayload(request);
  return presentation.payload ? (
    <DuplicateImportReview
      key={presentation.payload.id}
      open={presentation.open}
      candidates={presentation.payload.candidates}
    />
  ) : null;
}

function DuplicateImportReview({
  open,
  candidates,
}: {
  open: boolean;
  candidates: NonNullable<
    ReturnType<typeof useDuplicateImportReview>
  >["candidates"];
}) {
  const [index, setIndex] = useState(0);
  const [applyToAll, setApplyToAll] = useState(false);
  const [decisions, setDecisions] = useState<
    Record<string, DuplicateImportChoice>
  >({});
  const candidate = candidates[index];

  const choose = (choice: DuplicateImportChoice) => {
    if (!candidate) return;
    const next = { ...decisions, [candidate.path]: choice };
    if (applyToAll) {
      for (const item of candidates.slice(index)) next[item.path] = choice;
      completeDuplicateImportReview(next);
      return;
    }
    if (index >= candidates.length - 1) {
      completeDuplicateImportReview(next);
      return;
    }
    setDecisions(next);
    setIndex((current) => current + 1);
  };

  if (!candidate) return null;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open) closeDuplicateImportReview();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Review Duplicate Import</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>
            This file already exists in your Library.
          </Dialog.Description>
          <div className={styles.file}>
            <strong>{candidate.filename}</strong>
            <span>
              Matches {candidate.existingTitle || candidate.existingId}
            </span>
            <span>
              {index + 1} of {candidates.length}
            </span>
          </div>
          <div className={styles.apply}>
            <Checkbox.Root
              aria-label="Apply to all duplicate files"
              checked={applyToAll}
              onCheckedChange={(checked) => setApplyToAll(checked === true)}
            >
              <Checkbox.Indicator />
            </Checkbox.Root>
            Apply to All
          </div>
          <Dialog.Footer>
            <Button variant="secondary" onClick={() => choose("keep-both")}>
              Keep Both
            </Button>
            <Button onClick={() => choose("use-existing")}>Use Existing</Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
