import { Button } from "@pond/ui";
import type { AssistantChange } from "@shared/assistant";
import { useState } from "react";
import { openSave } from "@/lib/ui/save-nav";
import { assistant } from "@/stores/assistant";
import { useFolders } from "@/stores/folders";
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
  const applied = changes.filter((c) => c.status === "applied");
  const eligible = pending.filter((c) => selected.has(c.id));
  const failures = pending.filter((c) => c.error && selected.has(c.id));
  function display(change: AssistantChange, value: string | string[] | null) {
    if (!Array.isArray(value)) return value || "Untitled";
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
    <section
      className={styles["change-review"]}
      aria-label="Review Changes"
      aria-busy={Boolean(working)}
    >
      <div className={styles["review-header"]}>
        <span className={styles["review-eyebrow"]}>LIBRARY CHANGES</span>
        <h3>Review before applying</h3>
        <p>Only selected changes will be applied. You can undo them here.</p>
      </div>
      <div className={styles["change-list"]}>
        {changes.map((change) => (
          <div className={styles["change-item"]} key={change.id}>
            <div className={styles["change-save"]}>
              <input
                type="checkbox"
                aria-label={`Apply ${change.field} change to ${change.title}`}
                checked={
                  change.status === "applied" ||
                  (selected.has(change.id) && change.status === "pending")
                }
                disabled={
                  disabled || change.status !== "pending" || Boolean(working)
                }
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(change.id)) next.delete(change.id);
                    else next.add(change.id);
                    return next;
                  })
                }
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => openSave(change.saveId)}
              >
                {change.title}
              </button>
            </div>
            <div className={styles["change-field"]}>
              <span>
                {change.field === "title"
                  ? "Title"
                  : change.field === "tags"
                    ? "Tags"
                    : "Folders"}
              </span>
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
            {change.reason ? (
              <p className={styles["change-reason"]}>{change.reason}</p>
            ) : null}
            {change.error ? (
              <p className={styles["change-error"]}>{change.error}</p>
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles["review-actions"]}>
        {pending.length ? (
          <>
            <Button
              size="sm"
              disabled={disabled || !eligible.length || Boolean(working)}
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
          <span>No changes to apply.</span>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
