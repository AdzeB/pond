import {
  IconCheckOutline18,
  IconCircleDashedClockOutline18,
} from "@pond/icons/outline/18";
import { useReducedMotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Reveal } from "../reveal";
import { Shimmer } from "../shimmer";
import styles from "./styles.module.css";

export function RunStatus({
  state = "working",
  children,
}: {
  state?: "working" | "complete" | "stopped";
  children: ReactNode;
}) {
  const reduced = useReducedMotionConfig();
  return (
    <Reveal>
      <div
        className={styles["run-status"]}
        role="status"
        data-reduced-motion={reduced || undefined}
      >
        {state === "complete" ? (
          <IconCheckOutline18 />
        ) : state === "stopped" ? (
          <IconCircleDashedClockOutline18 />
        ) : null}
        {state === "working" ? (
          <Shimmer.Root className={styles["working-label"]}>
            {children}
          </Shimmer.Root>
        ) : (
          <span>{children}</span>
        )}
      </div>
    </Reveal>
  );
}
