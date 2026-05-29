import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_SOURCES,
  type AnySource,
} from "@/components/settings/sections/_types";
import {
  DEFAULT_GLOBAL_SYNC_PREFS,
  formatRelative,
  type ScheduleStatus,
} from "@/lib/sync-helpers";
import { useSaves } from "@/pool/hooks";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

type Tone = "default" | "muted" | "active" | "danger" | "success";

interface ItemProps {
  label: string;
  value: string;
  tone?: Tone;
}

export function Stats() {
  const [syncPrefs, , syncReady] = usePrefs("sync");
  const enabled = syncReady
    ? syncPrefs.global.enabled
    : DEFAULT_GLOBAL_SYNC_PREFS.enabled;
  const schedule = useScheduleStatus();
  const connected = useConnectedCount();
  const queue = useQueueCounts();

  const lastValue = schedule.lastFireAt
    ? formatRelative(new Date(schedule.lastFireAt))
    : "Never";
  const lastTone: Tone = schedule.lastFireAt ? "default" : "muted";

  let nextValue = "Off";
  let nextTone: Tone = enabled ? "default" : "muted";
  if (enabled) {
    if (schedule.nextDueAt) {
      const due = new Date(schedule.nextDueAt);
      if (due.getTime() <= Date.now()) {
        nextValue = "Due now";
        nextTone = "active";
      } else {
        nextValue = formatRelative(due);
      }
    } else {
      nextValue = "Off";
      nextTone = "muted";
    }
  }

  const connectedTone: Tone =
    connected === 0
      ? "muted"
      : connected === ALL_SOURCES.length
        ? "success"
        : "default";

  let queueValue: string;
  let queueTone: Tone;
  if (queue.total === 0) {
    queueValue = "Idle";
    queueTone = "muted";
  } else if (queue.failed > 0) {
    queueValue =
      queue.ingesting > 0
        ? `${queue.ingesting} running, ${queue.failed} failed`
        : `${queue.failed} failed`;
    queueTone = "danger";
  } else {
    queueValue = `${queue.ingesting} running`;
    queueTone = "active";
  }

  return (
    <dl className={styles.row}>
      <Item label="Last sync" value={lastValue} tone={lastTone} />
      <Item label="Next sync" value={nextValue} tone={nextTone} />
      <Item
        label="Connected"
        value={`${connected} of ${ALL_SOURCES.length}`}
        tone={connectedTone}
      />
      <Item label="Queue" value={queueValue} tone={queueTone} />
    </dl>
  );
}

function Item({ label, value, tone = "default" }: ItemProps) {
  return (
    <div className={styles.item} data-tone={tone}>
      <span className={styles.dot} aria-hidden />
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}

function useScheduleStatus(): ScheduleStatus {
  const qc = useQueryClient();
  const { data } = useQuery<ScheduleStatus>({
    queryKey: ["sync", "schedule", "stats"],
    queryFn: async () => {
      const res = await window.pond.syncSchedulePeek();
      if (!res.ok) return { lastFireAt: null, nextDueAt: null };
      return { lastFireAt: res.lastFireAt, nextDueAt: res.nextDueAt };
    },
  });
  useEffect(() => {
    return window.pond.onSyncSchedule((u) => {
      qc.setQueryData<ScheduleStatus>(["sync", "schedule", "stats"], {
        lastFireAt: u.lastFireAt,
        nextDueAt: u.nextDueAt,
      });
    });
  }, [qc]);
  return data ?? { lastFireAt: null, nextDueAt: null };
}

function useConnectedCount(): number {
  const [counts, setCounts] = useState<Record<string, boolean>>({});
  useQuery({
    queryKey: ["sources", "status-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        ALL_SOURCES.map(async ({ id }) => {
          const r = await window.pond.sourceStatus(id).catch(() => null);
          return [id, r?.ok ? r.connected : false] as const;
        }),
      );
      const next: Record<string, boolean> = {};
      for (const [id, c] of entries) next[id] = c;
      setCounts(next);
      return next;
    },
  });
  useEffect(() => {
    return window.pond.onSourceStatus((update) => {
      setCounts((prev) => ({
        ...prev,
        [update.source as AnySource]: update.connected,
      }));
    });
  }, []);
  return useMemo(() => Object.values(counts).filter(Boolean).length, [counts]);
}

function useQueueCounts() {
  const saves = useSaves();
  return useMemo(() => {
    let ingesting = 0;
    let failed = 0;
    for (const s of saves) {
      if (s.deletedAt) continue;
      if (s.status === "ingesting") ingesting += 1;
      else if (s.status === "failed") failed += 1;
    }
    return { ingesting, failed, total: ingesting + failed };
  }, [saves]);
}
