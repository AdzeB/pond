import { Button, Checkbox } from "@pond/ui";
import type { AssistantChange } from "@shared/assistant";
import { useState } from "react";
import { assistant } from "@/features/agent/state/assistant";
import { useFolders } from "@/features/library";
import { openSave } from "@/features/saves/navigation";
import styles from "./styles.module.css";

export function ChangeReview({
  messageId,
  changes,
  disabled = false,
}: {
  messageId: string;
  changes: AssistantChange[];
  disabled?: boolean;
}) {
  const folders = useFolders();
  const [selected, setSelected] = useState(
    () =>
      new Set(changes.filter((c) => c.status === "pending").map((c) => c.id)),
  );
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = changes.filter((c) => c.status === "pending");
  const applied = changes.filter(
    (c) => c.status === "applied" && c.undoable !== false,
  );
  const eligible = pending.filter((c) => selected.has(c.id));
  const failures = pending.filter((c) => c.error && selected.has(c.id));
  function display(
    change: AssistantChange,
    value: string | string[] | number | null,
  ) {
    if (change.field === "rating")
      return value == null ? "None" : String(value);
    if (change.field === "trash")
      return value === "trashed" ? "Trash" : "Library";
    if (change.field === "action") return value ? String(value) : "None";
    if (!Array.isArray(value)) {
      if (change.field === "note") return value || "None";
      return value || "Untitled";
    }
    return (
      value
        .map((id) =>
          change.field === "folders"
            ? (folders.find((folder) => folder.id === id)?.name ??
              "Deleted Folder")
            : id,
        )
        .join(", ") || "None"
    );
  }
  const fieldLabel = {
    title: "Title",
    note: "Note",
    tags: "Tags",
    folders: "Folders",
    rating: "Rating",
    trash: "Trash",
    action: "Library",
  };
  async function run(
    action: "apply" | "undo" | "dismiss",
    rows: AssistantChange[],
  ) {
    setError(null);
    for (const row of rows) {
      setWorking(row.id);
      try {
        await assistant.review(messageId, [row.id], action);
      } catch {
        setError(
          "Could not finish these changes. Check the results before retrying.",
        );
        break;
      }
    }
    setWorking(null);
  }
  return (
    <div>
      <div className={styles["change-list"]}>
        {changes.map((change) => (
          <div className={styles["change-item"]} key={change.id}>
            <div className={styles["change-save"]}>
              <Checkbox.Root
                size="sm"
                aria-label={`Apply ${change.field} change to ${change.title}`}
                checked={
                  change.status === "applied" ||
                  (selected.has(change.id) && change.status === "pending")
                }
                disabled={
                  disabled || change.status !== "pending" || Boolean(working)
                }
                onCheckedChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(change.id)) next.delete(change.id);
                    else next.add(change.id);
                    return next;
                  })
                }
              >
                <Checkbox.Indicator />
              </Checkbox.Root>
              {change.saveId ? (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={disabled || !change.saveId}
                  onClick={() => {
                    if (change.saveId) openSave(change.saveId);
                  }}
                >
                  {change.title}
                </Button>
              ) : (
                <span className={styles["operation-title"]}>
                  {change.title}
                </span>
              )}
            </div>
            <div className={styles["change-field"]}>
              <span>{fieldLabel[change.field] ?? change.field}</span>
              <span role="status">
                {working === change.id
                  ? "Updating"
                  : change.status === "pending"
                    ? change.error
                      ? "Failed"
                      : "Suggested"
                    : change.status === "applied"
                      ? "Applied"
                      : change.status === "undone"
                        ? "Undone"
                        : "Dismissed"}
              </span>
            </div>
            {change.field === "action" &&
            change.action === "runOperation" ? null : (
              <div className={styles["change-diff"]}>
                <div>
                  <span aria-hidden>−</span>
                  <span>{display(change, change.before)}</span>
                </div>
                <div>
                  <span aria-hidden>+</span>
                  <span>{display(change, change.after)}</span>
                </div>
              </div>
            )}
            {change.reason ? (
              <p className={styles["change-reason"]}>{change.reason}</p>
            ) : null}
            {change.field === "action" && change.action === "runOperation" ? (
              <details className={styles["operation-details"]}>
                <summary>Details</summary>
                <pre>{JSON.stringify(change.payload?.arguments, null, 2)}</pre>
              </details>
            ) : null}
            {change.error ? (
              <p className={styles["change-error"]}>{change.error}</p>
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        {pending.length ? (
          <>
            <Button
              size="sm"
              disabled={disabled || !eligible.length || Boolean(working)}
              loading={Boolean(working)}
              onClick={() => void run("apply", eligible)}
            >
              Apply {eligible.length || ""}{" "}
              {eligible.length === 1 ? "Change" : "Changes"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || Boolean(working)}
              onClick={() => void run("dismiss", pending)}
            >
              Dismiss
            </Button>
          </>
        ) : null}
        {failures.length ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || Boolean(working)}
            onClick={() => void run("apply", failures)}
          >
            Retry Failed
          </Button>
        ) : null}
        {applied.length ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || Boolean(working)}
            onClick={() => void run("undo", applied)}
          >
            Undo Applied
          </Button>
        ) : null}
        {!pending.length && !applied.length ? (
          <span>
            {changes.some((change) => change.status === "applied")
              ? "Changes applied."
              : "No changes to apply."}
          </span>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
