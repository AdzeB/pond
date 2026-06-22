import { Button, Settings } from "@pond/ui";
import { useState } from "react";
import {
  type LibraryTask,
  TASK_GROUPS,
  TASKS,
  type TaskResult,
} from "@/lib/tasks";

export function TasksSection() {
  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Tasks</Settings.Title>
        <Settings.Description>
          Run one-off jobs across your whole library. To run a task on specific
          items, select them and use the dock — or type “/” in Ask.
        </Settings.Description>
      </Settings.Header>

      {TASK_GROUPS.map((group) => {
        const tasks = TASKS.filter((t) => t.group === group.id);
        if (tasks.length === 0) return null;
        return (
          <Settings.Section key={group.id}>
            <Settings.SectionTitle>{group.label}</Settings.SectionTitle>
            <Settings.List>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </Settings.List>
          </Settings.Section>
        );
      })}
    </Settings.Page>
  );
}

function TaskRow({ task }: { task: LibraryTask }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);

  const onRun = async () => {
    setBusy(true);
    setResult(null);
    try {
      // Settings always runs library-wide (no selection scope).
      const r = await task.run();
      setResult(r);
    } catch {
      setResult({ ok: false, message: "Task failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Settings.Item>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{task.label}</Settings.ItemTitle>
        <Settings.ItemDescription
          data-state={result ? (result.ok ? "ok" : "error") : undefined}
        >
          {result ? result.message : task.description}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button size="sm" onClick={() => void onRun()} disabled={busy}>
          {busy ? "Running…" : task.action}
        </Button>
      </Settings.ItemControl>
    </Settings.Item>
  );
}
