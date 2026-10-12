import type { ReactNode } from "react";
import { ease, mix, progress } from "../../stage/timeline";
import { end, live, type SceneId, start } from "../timeline";
import styles from "./styles.module.css";

interface ShiftProps {
  t: number;
  scene: SceneId;
  /** How far to lift a long-cut surface that was laid out under a headline. */
  y: number;
  children: ReactNode;
}

/** Recenters a long-cut surface without its headline and pushes in slowly across the scene. */
export function Shift({ t, scene, y, children }: ShiftProps) {
  if (!live(t, scene)) return null;
  const push = ease.inOut(progress(t, start(scene), end(scene) - start(scene)));
  return (
    <div
      className={styles.shift}
      style={{ transform: `translateY(${y}px) scale(${mix(1, 1.04, push)})` }}
    >
      {children}
    </div>
  );
}
