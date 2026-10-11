import { IconChevronDown } from "@pond/icons";
import { Reveal } from "@pond/ui";
import { Accordion } from "@pond/ui/accordion";
import type { AssistantMetadata } from "@shared/assistant";
import { useReducedMotionConfig } from "motion/react";
import styles from "./styles.module.css";

const LONG_RUNNING_REPLY_MS = 30_000;

export function formatWorkDuration(elapsedMs: number): string {
  const seconds = Math.max(1, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours)
    return `${hours}h${minutes ? ` ${minutes}m` : ""}${remaining ? ` ${remaining}s` : ""}`;
  if (minutes) return `${minutes}m${remaining ? ` ${remaining}s` : ""}`;
  return `${seconds}s`;
}

const statusLabels = {
  running: "In progress",
  complete: "Completed",
  error: "Failed",
  stopped: "Stopped",
};

export function WorkSummary({
  metadata,
  streaming = false,
}: {
  metadata: AssistantMetadata | null | undefined;
  streaming?: boolean;
}) {
  const reduced = useReducedMotionConfig();
  const steps = metadata?.steps ?? [];
  const longRunning = (metadata?.elapsedMs ?? 0) >= LONG_RUNNING_REPLY_MS;
  const hasOutcome = Boolean(metadata?.stopped || metadata?.error);
  if (streaming || (!longRunning && !steps.length && !hasOutcome)) return null;
  const title =
    longRunning && metadata?.elapsedMs !== undefined
      ? `Worked for ${formatWorkDuration(metadata.elapsedMs)}`
      : "Activity";
  return (
    <Reveal initial={false}>
      <Accordion.Root className={styles.root}>
        <Accordion.Item value="work">
          <Accordion.Header className={styles.header}>
            <Accordion.Trigger className={styles.trigger}>
              {title}
              <IconChevronDown size={12} />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel
            className={styles.panel}
            data-reduced-motion={reduced || undefined}
          >
            <div className={styles.activity}>
              {steps.length ? (
                <ol className={styles.steps}>
                  {steps.map((step) => (
                    <li key={step.id} className={styles.step}>
                      <div className={styles.description}>
                        <span>{step.label}</span>
                        {step.detail ? <p>{step.detail}</p> : null}
                      </div>
                      <span className={styles.status}>
                        {statusLabels[step.status]}
                        {step.elapsedMs !== undefined
                          ? ` · ${formatWorkDuration(step.elapsedMs)}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  {metadata?.stopped
                    ? "Stopped before completing the reply."
                    : metadata?.error
                      ? "The reply ended with an error."
                      : "Generated a reply."}
                </p>
              )}
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </Reveal>
  );
}
