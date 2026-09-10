import type { ImagePose } from "@/features/saves/lib/viewer-memory";
import { poseFromNavigatorPoint, viewportFraction } from "./navigator-geometry";
import styles from "./styles.module.css";

interface NavigatorProps {
  src: string;
  pose: ImagePose;
  stage: { width: number; height: number };
  onPose: (pose: ImagePose) => void;
}

export function Navigator({ src, pose, stage, onPose }: NavigatorProps) {
  const box = viewportFraction(pose, stage);
  return (
    <section className={styles.root} aria-label="Navigator">
      <button
        type="button"
        className={styles.map}
        aria-label="Move view"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          onPose(
            poseFromNavigatorPoint(
              (event.clientX - rect.left) / rect.width,
              (event.clientY - rect.top) / rect.height,
              pose.zoom,
              stage,
            ),
          );
        }}
      >
        <img src={src} alt="" className={styles.image} draggable={false} />
        <span
          className={styles.viewport}
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.width * 100}%`,
            height: `${box.height * 100}%`,
          }}
        />
      </button>
    </section>
  );
}
