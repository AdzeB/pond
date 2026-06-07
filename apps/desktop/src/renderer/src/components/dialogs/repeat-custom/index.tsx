import { Button, Dialog, Field } from "@pond/ui";
import { useEffect, useState } from "react";
import { FrequencySelect } from "@/components/selects/frequency";
import {
  ALL_DAYS,
  type GlobalSyncPrefs,
  type SyncFrequency,
  WEEKDAYS,
} from "@/lib/utils/sync-helpers";
import styles from "./styles.module.css";

interface Props {
  open: boolean;
  initial: GlobalSyncPrefs;
  onClose: () => void;
  onSubmit: (next: Partial<GlobalSyncPrefs>) => void;
}

export function RepeatCustomDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [draftFrequency, setDraftFrequency] = useState<SyncFrequency>(
    initial.frequency,
  );
  const [draftWeekdays, setDraftWeekdays] = useState<number[]>(
    initial.weekdays ?? ALL_DAYS,
  );

  useEffect(() => {
    if (open) {
      setDraftFrequency(initial.frequency);
      setDraftWeekdays(initial.weekdays ?? ALL_DAYS);
    }
  }, [open, initial.frequency, initial.weekdays]);

  function toggleDraftWeekday(index: number) {
    setDraftWeekdays((prev) => {
      const set = new Set(prev);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      const next = Array.from(set).sort((a, b) => a - b);
      return next.length === 0 ? prev : next;
    });
  }

  const showDays = draftFrequency === "weekly";
  const canSubmit = !showDays || draftWeekdays.length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Title>Custom schedule</Dialog.Title>
          <Dialog.Description>
            Pick a cadence and the days Pond should run on.
          </Dialog.Description>
          <form
            className={styles["handle-form"]}
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              onSubmit({
                frequency: draftFrequency,
                weekdays:
                  draftFrequency === "weekly" ? draftWeekdays : ALL_DAYS,
              });
            }}
          >
            <Field.Root>
              <Field.Label>Frequency</Field.Label>
              <FrequencySelect
                value={draftFrequency}
                onValueChange={setDraftFrequency}
              />
            </Field.Root>

            {showDays ? (
              <Field.Root>
                <Field.Label>Days</Field.Label>
                <div className={styles["weekday-chips"]}>
                  {WEEKDAYS.map((d) => {
                    const on = draftWeekdays.includes(d.index);
                    return (
                      <button
                        key={d.index}
                        type="button"
                        aria-label={d.full}
                        aria-pressed={on}
                        className={styles["weekday-chip"]}
                        data-on={on ? "true" : "false"}
                        onClick={() => toggleDraftWeekday(d.index)}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
                <Field.Description>
                  Sync runs at the time set above, on the days you pick here.
                </Field.Description>
              </Field.Root>
            ) : null}

            <div className={styles["handle-actions"]}>
              <Dialog.Close render={<Button size="sm" variant="ghost" />}>
                Cancel
              </Dialog.Close>
              <Button size="sm" type="submit" disabled={!canSubmit}>
                Save
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
