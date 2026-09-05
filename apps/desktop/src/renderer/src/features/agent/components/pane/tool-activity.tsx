import {
  IconCheckOutline18,
  IconChevronDownOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import type { AssistantToolStep } from "@shared/assistant";
import styles from "./tool-activity.module.css";

export function ToolActivity({
  steps,
  active = false,
}: {
  steps: AssistantToolStep[];
  active?: boolean;
}) {
  const latest = steps.at(-1);
  if (!latest) return null;
  const failed = steps.some((step) => step.status === "error");
  const stopped = steps.some((step) => step.status === "stopped");
  const running = steps.some((step) => step.status === "running");
  const label =
    active && running
      ? latest.label
      : failed
        ? "Some work failed"
        : stopped
          ? "Work stopped"
          : `${steps.length} ${steps.length === 1 ? "step" : "steps"} completed`;
  return (
    <details className={styles.activity}>
      <summary>
        {running && active ? (
          <span className={styles.spinner} />
        ) : failed || stopped ? (
          <IconXmarkOutline18 />
        ) : (
          <IconCheckOutline18 />
        )}
        <span>{label}</span>
        <IconChevronDownOutline18 />
      </summary>
      <ol aria-label="Assistant activity">
        {steps.map((step) => (
          <li key={step.id} data-status={step.status}>
            <span className={styles.marker}>
              {step.status === "running" ? (
                <span className={styles.spinner} />
              ) : step.status === "complete" ? (
                <IconCheckOutline18 />
              ) : (
                <IconXmarkOutline18 />
              )}
            </span>
            <span className={styles["step-content"]}>
              <strong>{step.label}</strong>
              {step.detail ? <span>{step.detail}</span> : null}
            </span>
            <span className={styles.duration}>
              {step.status === "complete"
                ? `${((step.elapsedMs ?? 0) / 1000).toFixed(1)}s`
                : step.status === "running"
                  ? "Running"
                  : step.status === "stopped"
                    ? "Stopped"
                    : "Failed"}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
