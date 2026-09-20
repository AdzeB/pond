import { FetchRecurrenceSchema } from "@pond/schema";
import { DEFAULT_SYNC_CRON } from "@pond/schema/db";
import { Button, Input, Select, Toggle, ToggleGroup } from "@pond/ui";
import type { SyncSchedule } from "@shared/sync-schedule";
import { useState } from "react";
import { savePrefsSection, usePrefs } from "@/features/settings/state/prefs";
import styles from "./styles.module.css";

export function ScheduleSection() {
  const [sync, , loaded] = usePrefs("sync");
  if (!loaded) return null;
  return (
    <ScheduleEditor
      initial={sync.cron ?? DEFAULT_SYNC_CRON}
      onSave={(cron) => savePrefsSection("sync", { cron })}
    />
  );
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const units = ["hour", "day", "week", "month"] as const;

export function ScheduleEditor({
  initial,
  onSave,
}: {
  initial: SyncSchedule;
  onSave: (schedule: SyncSchedule) => void | Promise<void>;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [unit, setUnit] = useState(
    initial.recurrence?.unit ??
      (initial.calendar?.kind === "weekly"
        ? "week"
        : initial.calendar
          ? "day"
          : "hour"),
  );
  const [every, setEvery] = useState(
    String(
      initial.recurrence?.every ??
        (initial.calendar ? 1 : initial.intervalHours),
    ),
  );
  const [startDate, setStartDate] = useState(
    initial.recurrence?.startDate ?? localDate(new Date()),
  );
  const [time, setTime] = useState(
    initial.recurrence?.time ?? initial.calendar?.time ?? "18:00",
  );
  const [days, setDays] = useState(
    initial.recurrence?.days ??
      (initial.calendar?.kind === "weekly"
        ? initial.calendar.days
        : [new Date().getDay()]),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const parsed = FetchRecurrenceSchema.safeParse({
    startDate,
    every: Number(every),
    unit,
    time,
    days,
  });
  const valid = !enabled || parsed.success;
  const draft: SyncSchedule = {
    ...initial,
    enabled,
    calendar: null,
    recurrence: parsed.success ? parsed.data : initial.recurrence,
  };
  const edit = () => setStatus("idle");
  return (
    <form
      className={styles.form}
      onChange={edit}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid || status === "saving") return;
        setStatus("saving");
        try {
          await onSave(draft);
          setStatus("idle");
        } catch {
          setStatus("error");
        }
      }}
    >
      <fieldset className={styles.card} disabled={status === "saving"}>
        <legend className={styles.srOnly}>Fetch schedule</legend>
        <ScheduleSelect
          label="Schedule mode"
          value={enabled ? "scheduled" : "manual"}
          items={[
            { value: "scheduled", label: "Schedule" },
            { value: "manual", label: "Manual" },
          ]}
          onChange={(value) => {
            edit();
            setEnabled(value === "scheduled");
          }}
        />
        {enabled ? (
          <>
            <div className={styles.sentence}>
              <span className={styles.phrase}>
                Starting{" "}
                <Input.Root size="sm" className={styles.date}>
                  <Input.Field
                    aria-label="Start date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </Input.Root>
              </span>
              <span className={styles.phrase}>
                every{" "}
                <Input.Root size="sm" className={styles.interval}>
                  <Input.Field
                    aria-label="Repeat interval"
                    type="number"
                    min="1"
                    max="999"
                    step="1"
                    required
                    value={every}
                    onChange={(event) => setEvery(event.target.value)}
                  />
                </Input.Root>
                <ScheduleSelect
                  label="Repeat"
                  value={unit}
                  items={units.map((value) => ({
                    value,
                    label: Number(every) === 1 ? value : `${value}s`,
                  }))}
                  onChange={(selected) => {
                    edit();
                    setUnit(selected);
                  }}
                />
              </span>
              {unit !== "hour" ? (
                <span className={styles.phrase}>
                  at{" "}
                  <Input.Root size="sm" className={styles.time}>
                    <Input.Field
                      aria-label="Fetch time"
                      type="time"
                      required
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                    />
                  </Input.Root>
                </span>
              ) : null}
            </div>
            {unit === "week" ? (
              <fieldset className={styles.week}>
                <legend>On these days</legend>
                <ToggleGroup
                  multiple
                  className={styles.days}
                  aria-label="Days of week"
                  value={days.map(String)}
                  onValueChange={(values) => {
                    edit();
                    setDays(
                      values
                        .map(Number)
                        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)),
                    );
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <Toggle
                      key={day}
                      type="button"
                      size="sm"
                      value={String(day)}
                      aria-label={weekdayNames[day]}
                    >
                      {weekdayNames[day]?.slice(0, 3)}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </fieldset>
            ) : null}
          </>
        ) : (
          <p className={styles.manual}>
            Fetch updates when you choose Fetch Updates.
          </p>
        )}
      </fieldset>
      {enabled && unit === "month" && Number(startDate.slice(-2)) > 28 ? (
        <p className={styles.zone}>Shorter months use their last day.</p>
      ) : null}
      {!valid ? (
        <p className={styles.error} role="alert">
          {unit === "week" && !days.length
            ? "Choose at least one day."
            : "Choose a valid date, time, and whole number from 1 to 999."}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={!valid || status === "saving"}
        loading={status === "saving"}
      >
        {status === "saving" ? "Saving" : "Save Schedule"}
      </Button>
      {status === "error" ? (
        <p className={styles.error} role="alert">
          Couldn’t save your schedule. Try again.
        </p>
      ) : null}
    </form>
  );
}

function ScheduleSelect<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <Select.Trigger size="sm" aria-label={label}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
