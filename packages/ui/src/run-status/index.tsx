import { IconCheckOutline18 } from "@pond/icons/outline/18";
import { useReducedMotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Loader } from "../ai/loader";
import { Reveal } from "../reveal";
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
        className={styles.runStatus}
        role="status"
        data-reduced-motion={reduced || undefined}
      >
        {state === "working" ? (
          <Loader.Dots />
        ) : state === "complete" ? (
          <IconCheckOutline18 />
        ) : (
          <span className={styles.stopMark} />
        )}
        <span>{children}</span>
      </div>
    </Reveal>
  );
}
