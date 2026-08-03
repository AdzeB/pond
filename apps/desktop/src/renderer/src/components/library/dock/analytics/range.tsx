import { TrayCard } from "@pond/ui";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import {
  RANGE_OPTIONS,
  useDashboards,
} from "@/components/library/analytics/lib/dashboards";
import { snappySpring } from "@/lib/ui/motion";
import { dockMode } from "@/stores/dock-mode";
import styles from "./styles.module.css";

export function AnalyticsRangeSection() {
  const { dashboard, patchDashboard } = useDashboards();
  const groupId = useId();
  const reduceMotion = useReducedMotion();
  const highlightTransition = reduceMotion ? { duration: 0 } : snappySpring;

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Time Range</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          How far back the dashboard looks.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.rows}>
        {RANGE_OPTIONS.map((option) => {
          const active = option.value === dashboard.days;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={styles.option}
              onClick={() => {
                patchDashboard({ days: option.value });
                dockMode.close();
              }}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  layoutId={`${groupId}-range`}
                  className={styles.highlight}
                  transition={highlightTransition}
                />
              ) : null}
              <span className={styles.label}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
