import { Button, useToast } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  DEFAULT_GLOBAL_SYNC_PREFS,
  formatScheduleFooter,
  type ScheduleStatus,
} from "@/lib/sync-helpers";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

export function Header() {
  const toast = useToast();
  const [syncPrefs, , syncReady] = usePrefs("sync");
  const enabled = syncReady
    ? syncPrefs.global.enabled
    : DEFAULT_GLOBAL_SYNC_PREFS.enabled;
  const status = useScheduleStatus();
  const anyRunning = useAnyRunning();

  async function onClick() {
    try {
      await window.pond.syncRunAll();
      toast.add({
        title: "Sync started",
        description: "Pond is checking every connected source.",
        type: "info",
      });
    } catch {
      toast.add({ title: "Couldn't start sync", type: "error" });
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>Sync</h1>
        <p className={styles.status}>{formatScheduleFooter(status, enabled)}</p>
      </div>
      <Button
        size="md"
        disabled={!syncReady || anyRunning}
        onClick={() => void onClick()}
      >
        {anyRunning ? "Syncing\u2026" : "Sync now"}
      </Button>
    </header>
  );
}

function useScheduleStatus(): ScheduleStatus {
  const qc = useQueryClient();
  const { data } = useQuery<ScheduleStatus>({
    queryKey: ["sync", "schedule", "header"],
    queryFn: async () => {
      const res = await window.pond.syncSchedulePeek();
      if (!res.ok) return { lastFireAt: null, nextDueAt: null };
      return { lastFireAt: res.lastFireAt, nextDueAt: res.nextDueAt };
    },
  });
  useEffect(() => {
    return window.pond.onSyncSchedule((u) => {
      qc.setQueryData<ScheduleStatus>(["sync", "schedule", "header"], {
        lastFireAt: u.lastFireAt,
        nextDueAt: u.nextDueAt,
      });
    });
  }, [qc]);
  return data ?? { lastFireAt: null, nextDueAt: null };
}

function useAnyRunning(): boolean {
  const [running, setRunning] = useState<Set<string>>(new Set());
  useEffect(() => {
    return window.pond.onSyncStatus((u) => {
      setRunning((prev) => {
        const next = new Set(prev);
        if (u.state === "running") next.add(u.source);
        else next.delete(u.source);
        return next;
      });
    });
  }, []);
  return running.size > 0;
}
