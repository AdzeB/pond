import {
  IconArrowUpRight,
  IconBookmark,
  IconChevronDown,
  IconCompass,
  IconDuplicate,
  IconEye,
  IconFilterPlus,
  IconFolder,
  IconGrid,
  IconImage,
  IconLayers,
  IconMagnifier,
  IconPencil,
} from "@pond/icons";
import { Reveal } from "@pond/ui";
import { Accordion } from "@pond/ui/accordion";
import { Shimmer } from "@pond/ui/shimmer";
import type { AssistantMetadata, AssistantToolStep } from "@shared/assistant";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { type ActivityIcon, activityLines } from "../activity-label";
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

const icons: Record<ActivityIcon, ReactNode> = {
  search: <IconMagnifier size={12} />,
  read: <IconEye size={12} />,
  folder: <IconFolder size={12} />,
  filter: <IconFilterPlus size={12} />,
  view: <IconGrid size={12} />,
  cite: <IconBookmark size={12} />,
  open: <IconArrowUpRight size={12} />,
  duplicate: <IconDuplicate size={12} />,
  image: <IconImage size={12} />,
  review: <IconPencil size={12} />,
  explore: <IconCompass size={12} />,
  operation: <IconLayers size={12} />,
};

const outcomeLabels = { error: "Failed", stopped: "Stopped" };

const ROW_HEIGHT = 26;

export function ActivityLog({
  steps,
  thinking,
  avatar,
  live = false,
}: {
  steps: readonly AssistantToolStep[];
  thinking?: string;
  avatar?: ReactNode;
  live?: boolean;
}) {
  const reduced = useReducedMotionConfig();
  const row = {
    initial: reduced ? false : { height: 0, opacity: 0, y: 6 },
    animate: { height: ROW_HEIGHT, opacity: 1, y: 0 },
    exit: reduced ? undefined : { height: 0, opacity: 0, y: -4 },
    transition: reduced
      ? { duration: 0 }
      : { type: "spring" as const, duration: 0.32, bounce: 0 },
  };
  return (
    <ol className={styles.steps}>
      <AnimatePresence initial={live}>
        {activityLines(steps).map((line) => (
          <motion.li
            key={line.id}
            className={styles.step}
            data-status={line.status}
            {...row}
          >
            <span className={styles.icon} aria-hidden>
              {icons[line.icon]}
            </span>
            {line.status === "running" ? (
              <Shimmer.Root className={styles.label}>{line.label}</Shimmer.Root>
            ) : (
              <span className={styles.label}>{line.label}</span>
            )}
            {line.detail ? (
              <span className={styles.detail}>{line.detail}</span>
            ) : null}
            {line.status === "error" || line.status === "stopped" ? (
              <span className={styles.meta}>{outcomeLabels[line.status]}</span>
            ) : line.elapsedMs && line.elapsedMs >= 1000 ? (
              <span className={styles.meta}>
                {formatWorkDuration(line.elapsedMs)}
              </span>
            ) : null}
          </motion.li>
        ))}
        {thinking ? (
          <motion.li
            key="thinking"
            className={styles.step}
            data-status="running"
            {...row}
          >
            <span className={styles.icon} aria-hidden>
              {avatar}
            </span>
            <Shimmer.Root className={styles.label}>{thinking}</Shimmer.Root>
          </motion.li>
        ) : null}
      </AnimatePresence>
    </ol>
  );
}

export function WorkSummary({
  metadata,
  streaming = false,
}: {
  metadata: AssistantMetadata | null | undefined;
  streaming?: boolean;
}) {
  const reduced = useReducedMotionConfig();
  const steps = metadata?.steps ?? [];
  const elapsed = metadata?.elapsedMs;
  const longRunning = (elapsed ?? 0) >= LONG_RUNNING_REPLY_MS;
  const hasOutcome = Boolean(metadata?.stopped || metadata?.error);
  if (streaming || (!longRunning && !steps.length && !hasOutcome)) return null;
  const title =
    elapsed !== undefined && (longRunning || steps.length)
      ? `Worked for ${formatWorkDuration(elapsed)}`
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
                <ActivityLog steps={steps} />
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
