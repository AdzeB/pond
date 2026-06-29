import { Button } from "@pond/ui";
import { useState } from "react";
import styles from "@/components/library-sync-monitor/styles.module.css";
import {
  type LibraryTask,
  TASK_GROUPS,
  TASKS,
  type TaskResult,
} from "@/lib/save/tasks";

export function TasksPanel() {
  return (
    <div className={styles.tasks}>
      {TASK_GROUPS.map((group) => {
        const tasks = TASKS.filter((t) => t.group === group.id);
        if (tasks.length === 0) return null;
        return (
          <div key={group.id} className={styles.taskGroup}>
            <div className={styles.taskGroupLabel}>{group.label}</div>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({ task }: { task: LibraryTask }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);

  const onRun = async () => {
    setBusy(true);
    setResult(null);
    try {
      // Sources page always runs library-wide (no selection scope).
      const r = await task.run();
      setResult(r);
    } catch {
      setResult({ ok: false, message: "Task failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.taskRow}>
      <div className={styles.taskInfo}>
        <div className={styles.taskName}>{task.label}</div>
        <div
          className={styles.taskDesc}
          data-state={result ? (result.ok ? "ok" : "error") : undefined}
        >
          {result ? result.message : task.description}
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void onRun()}
        disabled={busy}
      >
        {busy ? "Running…" : task.action}
      </Button>
    </div>
  );
}
