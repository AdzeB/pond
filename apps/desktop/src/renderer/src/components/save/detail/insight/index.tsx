import {
  IconRefreshOutline18 as Regenerate,
  IconArrowRotateClockwiseOutline18 as Retry,
} from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { ExpandableText } from "@/components/shared/expandable-text";
import styles from "./styles.module.css";

export type InsightState = "ready" | "running" | "queued" | "failed";

export interface InsightSpec {
  id: string;
  label: string;
  state: InsightState;
  text?: string;
  content?: ReactNode;
  onRegenerate?: () => void;
  onRetry?: () => void;
}

const PENDING_LABEL: Record<Exclude<InsightState, "ready">, string> = {
  running: "Generating",
  queued: "Waiting to process",
  failed: "Couldn’t generate.",
};

function Insight({
  label,
  state,
  text,
  content,
  onRegenerate,
  onRetry,
}: InsightSpec) {
  const pending = state !== "ready";
  return (
    <div className={styles.insight} data-state={state}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {state === "running" ? (
          <span className={styles.spinner} aria-hidden />
        ) : state === "failed" && onRetry ? (
          <button type="button" className={styles.action} onClick={onRetry}>
            <Retry width={14} height={14} />
            Retry
          </button>
        ) : state === "ready" && onRegenerate ? (
          <button
            type="button"
            className={styles["icon-action"]}
            onClick={onRegenerate}
            aria-label={`Regenerate ${label.toLowerCase()}`}
          >
            <Regenerate width={14} height={14} />
          </button>
        ) : null}
      </div>
      {pending ? (
        <span className={styles.pending}>
          {PENDING_LABEL[state as Exclude<InsightState, "ready">]}
        </span>
      ) : text != null ? (
        <ExpandableText text={text} />
      ) : (
        content
      )}
    </div>
  );
}

export function Insights({ insights }: { insights: InsightSpec[] }) {
  if (insights.length === 0) return null;
  return (
    <div className={styles.insights}>
      {insights.map((insight) => (
        <Insight key={insight.id} {...insight} />
      ))}
    </div>
  );
}
