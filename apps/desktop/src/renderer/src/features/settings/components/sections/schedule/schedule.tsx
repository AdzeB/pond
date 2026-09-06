import { DEFAULT_SYNC_CRON } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { describeSyncSchedule, type SyncSchedule } from "@shared/sync-schedule";
import { useState } from "react";
import { usePrefs } from "@/features/settings/state/prefs";
import styles from "./schedule.module.css";

export function ScheduleSection() {
  const [sync, patchSync, loaded] = usePrefs("sync");
  const [saved, setSaved] = useState(false);
  if (!loaded) return null;
  return (
    <div onChange={() => setSaved(false)}>
      <ScheduleEditor
        initial={sync.cron ?? DEFAULT_SYNC_CRON}
        onSave={(cron) => {
          patchSync({ cron });
          setSaved(true);
        }}
      />
      {saved ? (
        <p role="status" className={styles.zone}>
          Schedule saved for all connections and watches.
        </p>
      ) : null}
    </div>
  );
}

export function ScheduleEditor({
  initial,
  onSave,
}: {
  initial: SyncSchedule;
  onSave: (schedule: SyncSchedule) => void;
}) {
  const [mode, setMode] = useState(
    initial.enabled ? (initial.calendar?.kind ?? "hourly") : "manual",
  );
  const [hours, setHours] = useState(String(initial.intervalHours));
  const [time, setTime] = useState(initial.calendar?.time ?? "09:00");
  const [days, setDays] = useState(
    initial.calendar?.kind === "weekly"
      ? initial.calendar.days
      : [1, 2, 3, 4, 5],
  );
  const valid =
    mode === "manual" ||
    (mode === "hourly"
      ? Number.isFinite(Number(hours)) && Number(hours) >= 1
      : /^([01]\d|2[0-3]):[0-5]\d$/.test(time) &&
        (mode !== "weekly" || days.length > 0));
  const draft: SyncSchedule = {
    enabled: mode !== "manual",
    intervalHours: mode === "hourly" ? Number(hours) : initial.intervalHours,
    calendar:
      mode === "daily"
        ? { kind: "daily", time }
        : mode === "weekly"
          ? { kind: "weekly", time, days }
          : null,
  };
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave(draft);
      }}
    >
      <label className={styles.field}>
        <span>Repeat</span>
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      {mode === "hourly" ? (
        <label className={styles.field}>
          <span>Every</span>
          <span className={styles.interval}>
            <input
              aria-label="Interval in hours"
              type="number"
              min="1"
              step="any"
              required
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
            <span>hours</span>
          </span>
        </label>
      ) : null}
      {mode === "weekly" ? (
        <fieldset className={styles.week}>
          <legend>On these days</legend>
          <div className={styles.days}>
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const name = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][day];
              return (
                <Button
                  key={day}
                  type="button"
                  variant={days.includes(day) ? "primary" : "tertiary"}
                  size="sm"
                  aria-label={name}
                  aria-pressed={days.includes(day)}
                  onClick={() =>
                    setDays((current) =>
                      current.includes(day)
                        ? current.filter((value) => value !== day)
                        : [...current, day].sort(
                            (a, b) => ((a + 6) % 7) - ((b + 6) % 7),
                          ),
                    )
                  }
                >
                  {name?.slice(0, 1)}
                </Button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {mode === "daily" || mode === "weekly" ? (
        <>
          <label className={styles.field}>
            <span>At</span>
            <input
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          <p className={styles.zone}>
            Local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </>
      ) : null}
      <div className={styles.summary} aria-live="polite">
        <span>YOUR SCHEDULE</span>
        <strong>
          {valid
            ? describeSyncSchedule(draft)
            : mode === "weekly"
              ? "Choose at least one day"
              : "Choose a valid interval or time"}
        </strong>
      </div>
      <Button
        type="submit"
        size="lg"
        variant="secondary"
        width="full"
        disabled={!valid}
      >
        Save Schedule
      </Button>
    </form>
  );
}
