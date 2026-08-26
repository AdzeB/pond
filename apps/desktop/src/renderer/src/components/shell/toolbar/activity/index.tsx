import { IconStopwatchOutline18 as ProgressIcon } from "@pond/icons/outline/18";
import { AnimatePresence, motion } from "motion/react";
import { useStatusFeed } from "@/lib/status-feed";
import { bindPanel, closeThen, openSaveFromPanel, type Panel } from "../lib";
import { Empty, List, Row, StatusPanel } from "../panel";
import { StatusSpinner, statusIconTransition } from "../spinner";
import styles from "./styles.module.css";

interface ProgressPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

const PREVIEW_LIMIT = 20;

export function ProgressPanel({ open, onOpenChange }: ProgressPanelProps) {
  const { inProgress } = useStatusFeed();
  const { saving, running, busy } = inProgress;

  const savingPreview = saving.slice(0, PREVIEW_LIMIT);
  const runningPreview = running.slice(
    0,
    Math.max(0, PREVIEW_LIMIT - savingPreview.length),
  );

  return (
    <StatusPanel
      open={open}
      onOpenChange={bindPanel(onOpenChange, "progress")}
      ariaLabel={busy ? "In progress, working" : "In progress"}
      heading="In Progress"
      icon={
        <span className={styles.icon} data-busy={busy ? "" : undefined}>
          <AnimatePresence mode="popLayout" initial={false}>
            {busy ? (
              <StatusSpinner key="spinner" />
            ) : (
              <motion.span
                key="idle"
                className={styles.idle}
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{
                  position: "absolute",
                  opacity: 0,
                  rotate: 180,
                  transition: statusIconTransition,
                }}
                transition={{
                  ...statusIconTransition,
                  delay: 0.2,
                }}
              >
                <ProgressIcon />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      }
    >
      {!busy ? (
        <Empty>Nothing in progress</Empty>
      ) : (
        <List>
          {savingPreview.map((row) => (
            <Row
              key={row.save.id}
              title={row.name}
              subtitle={row.stage ?? "Saving"}
              meta={`${Math.round(row.progress * 100)}%`}
              onClick={closeThen(onOpenChange, () =>
                openSaveFromPanel(row.save.id),
              )}
            />
          ))}
          {runningPreview.map((entry) => (
            <Row
              key={entry.id}
              title={entry.label}
              subtitle={entry.message}
              meta="now"
            />
          ))}
        </List>
      )}
    </StatusPanel>
  );
}
