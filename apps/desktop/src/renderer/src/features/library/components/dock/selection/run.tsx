import {
  IconEyeSparkleFill18 as EyeSparkle,
  IconImageSparkleFill18 as ImageSparkle,
  IconMagnifierSparkleFill18 as MagnifierSparkle,
  IconArrowRotateClockwiseFill18 as Retry,
  IconScanTextFill18 as ScanText,
  IconBookmarkFill18 as Tag,
  IconWaveformLinesFill18 as Waveform,
} from "@pond/icons/fill/18";
import { Button, TrayCard } from "@pond/ui";
import { type ReactNode, useEffect, useState } from "react";
import { useDock } from "@/features/library/components/dock/lib/context";
import { selection } from "@/features/library/state/selection";
import {
  failedIdsIn,
  retryFailedSelection,
} from "@/features/saves/lib/selection";
import { selectableTasks } from "@/features/saves/lib/tasks";
import { pool } from "@/features/saves/state/pool";
import { usePrefsValue } from "@/features/settings/state/prefs";
import { formatNumber } from "@/shared/lib/format";
import styles from "./selection.module.css";

const STATUS_HOLD_MS = 1200;

const TASK_ICONS: ReadonlyMap<string, ReactNode> = new Map([
  ["auto-tag", <Tag size={18} />],
  ["caption", <ImageSparkle size={18} />],
  ["ocr", <ScanText size={18} />],
  ["transcribe", <Waveform size={18} />],
  ["re-embed", <MagnifierSparkle size={18} />],
  ["rebuild-visual", <EyeSparkle size={18} />],
]);

interface Status {
  id: string;
  message: string;
  ok: boolean;
}

export function SelectionRunSection() {
  const dock = useDock();
  const prefs = usePrefsValue();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const selected = selection.snapshot();
  const failedCount = failedIdsIn(selected).length;
  const incomplete = selected.some((id) => !pool.get(id));

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => dock.closeViewMenu(), STATUS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [status, dock]);

  const run = async (task: ReturnType<typeof selectableTasks>[number]) => {
    const scope = selection.snapshot();
    if (scope.length === 0 || busy || status) return;
    setBusy(true);
    try {
      const res = await task.run(scope);
      setStatus({ id: task.id, message: res.message, ok: res.ok });
    } catch {
      setStatus({ id: task.id, message: `${task.label} failed.`, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    const scope = selection.snapshot();
    if (scope.length === 0 || busy || status) return;
    setBusy(true);
    try {
      await retryFailedSelection(scope);
    } finally {
      setBusy(false);
      dock.closeViewMenu();
    }
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Run a Task</TrayCard.Title>
        <TrayCard.Close disabled={busy} />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.rows}>
        {selectableTasks().map((task) => {
          const hint = task.precondition?.(prefs) ?? null;
          const swapped = status?.id === task.id;
          return (
            <Button
              key={task.id}
              variant="ghost"
              size="xl"
              width="full"
              className={styles.row}
              disabled={busy || status !== null || hint !== null}
              onClick={() => void run(task)}
            >
              <span className={styles.icon}>{TASK_ICONS.get(task.id)}</span>
              <span className={styles.text}>
                <span
                  className={styles.label}
                  data-tone={swapped && !status.ok ? "error" : undefined}
                >
                  {swapped ? status.message : task.label}
                </span>
                <span
                  className={styles.description}
                  data-tone={hint ? "hint" : undefined}
                >
                  {hint ?? task.description}
                </span>
              </span>
            </Button>
          );
        })}
        {failedCount > 0 || incomplete ? (
          <Button
            variant="ghost"
            size="xl"
            width="full"
            className={styles.row}
            disabled={busy || status !== null}
            onClick={() => void retry()}
          >
            <span className={styles.icon}>
              <Retry size={18} />
            </span>
            <span className={styles.text}>
              <span className={styles.label}>Retry Failed</span>
              <span className={styles.description}>
                {incomplete
                  ? "Retry failed items in the selection."
                  : `Run ${formatNumber(failedCount)} failed item${failedCount === 1 ? "" : "s"} again.`}
              </span>
            </span>
          </Button>
        ) : null}
      </div>
    </>
  );
}
