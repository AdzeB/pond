import { type ReactNode, useState } from "react";
import { Button } from "../button";
import { Reveal } from "../reveal";
import styles from "./styles.module.css";

export function ApprovalCard({
  title,
  description,
  children,
  decision = "pending",
  onApprove,
  onReject,
  approveLabel = "Approve",
  rejectLabel = "Decline",
  eyebrow,
  showActions,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  decision?: "pending" | "approved" | "rejected";
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  approveLabel?: string;
  rejectLabel?: string;
  eyebrow?: string;
  showActions?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function respond(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn't record your decision. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Reveal>
      <section
        className={styles["review-card"]}
        aria-label={title}
        aria-busy={busy}
      >
        <div className={styles.header}>
          <span className={styles.eyebrow}>
            {eyebrow ??
              (decision === "pending"
                ? "Review"
                : decision === "approved"
                  ? "Approved"
                  : "Declined")}
          </span>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {children && <div className={styles.body}>{children}</div>}
        {error && (
          <div className={styles["inline-error"]} role="alert">
            {error}
          </div>
        )}
        {(showActions ?? decision === "pending") && (
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void respond(onReject)}
            >
              {rejectLabel}
            </Button>
            <Button
              size="sm"
              disabled={busy}
              loading={busy}
              onClick={() => void respond(onApprove)}
            >
              {busy ? "Saving decision" : approveLabel}
            </Button>
          </div>
        )}
      </section>
    </Reveal>
  );
}
