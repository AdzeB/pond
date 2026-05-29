import { Button, Dialog, Field, Select } from "@pond/ui";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ALL_DAYS,
  FREQUENCY_OPTIONS,
  type GlobalSyncPrefs,
  type SyncFrequency,
  WEEKDAYS,
} from "@/lib/sync-helpers";
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
              <Select.Root<SyncFrequency>
                value={draftFrequency}
                onValueChange={(v) =>
                  setDraftFrequency((v ?? "daily") as SyncFrequency)
                }
              >
                <Select.Trigger>
                  <Select.Value>
                    {FREQUENCY_OPTIONS.find((o) => o.value === draftFrequency)
                      ?.label ?? "Daily"}
                  </Select.Value>
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      {FREQUENCY_OPTIONS.map((o) => (
                        <Select.Item key={o.value} value={o.value}>
                          {o.label}
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
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
