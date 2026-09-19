import { FetchRecurrenceSchema } from "@pond/schema";
import { DEFAULT_SYNC_CRON } from "@pond/schema/db";
import { Button } from "@pond/ui";
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
        <select
          className={styles.trigger}
          aria-label="Schedule mode"
          value={enabled ? "scheduled" : "manual"}
          onChange={(event) => setEnabled(event.target.value === "scheduled")}
        >
          <option value="scheduled">Schedule</option>
          <option value="manual">Manual</option>
        </select>
        {enabled ? (
          <>
            <div className={styles.sentence}>
              <span className={styles.phrase}>
                Starting{" "}
                <input
                  aria-label="Start date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </span>
              <span className={styles.phrase}>
                every{" "}
                <input
                  className={styles.interval}
                  aria-label="Repeat interval"
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  required
                  value={every}
                  onChange={(event) => setEvery(event.target.value)}
                />
                <select
                  aria-label="Repeat"
                  value={unit}
                  onChange={(event) => {
                    const selected = units.find(
                      (value) => value === event.target.value,
                    );
                    if (selected) setUnit(selected);
                  }}
                >
                  {units.map((value) => (
                    <option key={value} value={value}>
                      {value}
                      {Number(every) === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </span>
              {unit !== "hour" ? (
                <span className={styles.phrase}>
                  at{" "}
                  <input
                    aria-label="Fetch time"
                    type="time"
                    required
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </span>
              ) : null}
            </div>
            {unit === "week" ? (
              <fieldset className={styles.week}>
                <legend>On these days</legend>
                <div className={styles.days}>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={days.includes(day) ? "primary" : "tertiary"}
                      aria-label={weekdayNames[day]}
                      aria-pressed={days.includes(day)}
                      onClick={() => {
                        edit();
                        setDays((current) =>
                          current.includes(day)
                            ? current.filter((value) => value !== day)
                            : [...current, day].sort(
                                (a, b) => ((a + 6) % 7) - ((b + 6) % 7),
                              ),
                        );
                      }}
                    >
                      {weekdayNames[day]?.slice(0, 3)}
                    </Button>
                  ))}
                </div>
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
