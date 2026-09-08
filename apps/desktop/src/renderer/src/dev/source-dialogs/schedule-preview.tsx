import type { SyncSchedule } from "@shared/sync-schedule";
import { useState } from "react";
import { ScheduleEditor } from "@/features/settings/components/sections/schedule/schedule";
import styles from "./schedule-preview.module.css";

export function SchedulePreview() {
  const [schedule, setSchedule] = useState<SyncSchedule>({
    enabled: true,
    intervalHours: 12,
    calendar: { kind: "daily", time: "18:00" },
  });
  return (
    <main className={styles.page}>
      <a href="/source-dialogs.html">Source Dialogs</a>
      <h1>Fetch Schedule</h1>
      <p>Choose when Pond checks your connections and watches for updates.</p>
      <ScheduleEditor initial={schedule} onSave={setSchedule} />
    </main>
  );
}
