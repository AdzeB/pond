import {
  IconEyeSparkleFill18 as EyeSparkle,
  IconImageSparkleFill18 as ImageSparkle,
  IconMagnifierSparkleFill18 as MagnifierSparkle,
  IconArrowRotateClockwiseFill18 as Retry,
  IconScanTextFill18 as ScanText,
  IconTagFill18 as Tag,
  IconWaveformLinesFill18 as Waveform,
} from "@pond/icons/fill/18";
import { TrayCard } from "@pond/ui";
import { type ReactNode, useEffect, useState } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import { failedIdsIn, retryFailedSelection } from "@/lib/save/selection";
import { selectableTasks } from "@/lib/save/tasks";
import { formatNumber } from "@/lib/util/format";
import { usePrefsValue } from "@/stores/prefs";
import { selection } from "@/stores/selection";
import styles from "./styles.module.css";

/** Long enough to read the swapped label before the card closes. */
const STATUS_HOLD_MS = 1200;

const TASK_ICONS: Record<string, ReactNode> = {
  "auto-tag": <Tag size={18} />,
  caption: <ImageSparkle size={18} />,
  ocr: <ScanText size={18} />,
  transcribe: <Waveform size={18} />,
  "re-embed": <MagnifierSparkle size={18} />,
  "rebuild-visual": <EyeSparkle size={18} />,
};

interface Status {
  id: string;
  message: string;
  ok: boolean;
}

/** Task chooser opened from the selection pill's Run tile. Preconditions render as disabled rows with the hint; outcomes swap into the row, with longer-running work owned by the activity pill. */
export function SelectionRunSection() {
  const dock = useDock();
  const prefs = usePrefsValue();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const failedCount = failedIdsIn(selection.snapshot()).length;

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
      /** Requeued items reappear in the saving pill and queue, so the card just closes. */
      await retryFailedSelection(scope);
    } finally {
      setBusy(false);
      dock.closeViewMenu();
    }
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back disabled={busy} onClick={() => dock.closeViewMenu()} />
        <TrayCard.Title position="center">Run a Task</TrayCard.Title>
        <TrayCard.Close disabled={busy} />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.rows}>
        {selectableTasks().map((task) => {
          const hint = task.precondition?.(prefs) ?? null;
          const swapped = status?.id === task.id;
          return (
            <button
              key={task.id}
              type="button"
              className={styles.row}
              disabled={busy || status !== null || hint !== null}
              onClick={() => void run(task)}
            >
              <span className={styles["row-icon"]}>{TASK_ICONS[task.id]}</span>
              <span className={styles["row-text"]}>
                <span
                  className={styles["row-label"]}
                  data-tone={swapped && !status.ok ? "error" : undefined}
                >
                  {swapped ? status.message : task.label}
                </span>
                <span
                  className={styles["row-description"]}
                  data-tone={hint ? "hint" : undefined}
                >
                  {hint ?? task.description}
                </span>
              </span>
            </button>
          );
        })}
        {failedCount > 0 ? (
          <button
            type="button"
            className={styles.row}
            disabled={busy || status !== null}
            onClick={() => void retry()}
          >
            <span className={styles["row-icon"]}>
              <Retry size={18} />
            </span>
            <span className={styles["row-text"]}>
              <span className={styles["row-label"]}>Retry Failed</span>
              <span className={styles["row-description"]}>
                Run {formatNumber(failedCount)} failed item
                {failedCount === 1 ? "" : "s"} again.
              </span>
            </span>
          </button>
        ) : null}
      </div>
    </>
  );
}
