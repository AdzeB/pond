import { IconMagnifierFill18 as Magnifier } from "@pond/icons/fill/18";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";
import { usePointerSheen } from "@/hooks/use-pointer-sheen";
import { bouncySpring } from "@/lib/motion";
import styles from "./styles.module.css";

// Drag velocity (px/s) → stretch along the travel axis. Tuned so a brisk fling
// reaches roughly MAX_STRETCH, then springs back to rest as the bar settles.
const STRETCH_PER_VELOCITY = 0.00006;
const MAX_STRETCH = 0.12;

const VELOCITY_SPRING = { damping: 28, stiffness: 240, mass: 0.6 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Live demo of the liquid-glass settings. The glass bar references the same
// global SVG filters and --pond-glass-blur variable as the real UI, so dragging
// the Refraction / Chromatic aberration / Blur sliders (or toggling the effect)
// updates this scene instantly. It also shows the three "feel" touches: it
// springs in, you can grab and fling it (it squashes and stretches with the
// throw, deforming its own refraction), and a specular glint tracks the pointer.
export function GlassPreview() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const sheen = usePointerSheen();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Smooth the raw drag velocity so the deform eases rather than snaps.
  const velocityX = useSpring(useVelocity(x), VELOCITY_SPRING);
  const velocityY = useSpring(useVelocity(y), VELOCITY_SPRING);

  // Squash & stretch: elongate along whichever axis is moving fastest and pinch
  // on the other, like a blob of liquid resisting the throw.
  const scaleX = useTransform([velocityX, velocityY], (latest: number[]) => {
    const vx = latest[0] ?? 0;
    const vy = latest[1] ?? 0;
    return clamp(
      1 + (Math.abs(vx) - Math.abs(vy)) * STRETCH_PER_VELOCITY,
      1 - MAX_STRETCH,
      1 + MAX_STRETCH,
    );
  });
  const scaleY = useTransform([velocityX, velocityY], (latest: number[]) => {
    const vx = latest[0] ?? 0;
    const vy = latest[1] ?? 0;
    return clamp(
      1 + (Math.abs(vy) - Math.abs(vx)) * STRETCH_PER_VELOCITY,
      1 - MAX_STRETCH,
      1 + MAX_STRETCH,
    );
  });

  // Drag + velocity deform live on the inner glass; the wrapper owns the
  // spring-in so the two transform stacks never fight over the same property.
  const dragProps = reduceMotion
    ? null
    : {
        drag: true,
        dragConstraints: sceneRef,
        dragElastic: 0.18,
        style: { x, y, scaleX, scaleY },
      };

  return (
    <div ref={sceneRef} className={styles.scene} aria-hidden="true">
      <div className={styles.backdrop} />
      <p className={styles.headline}>Liquid Glass</p>

      <motion.div
        className={styles.toolbarWrap}
        initial={{ opacity: 0, scale: 0.9, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={bouncySpring}
      >
        <motion.div className={styles.toolbar} {...sheen} {...dragProps}>
          <span className={styles.button} />
          <span className={styles.button} />
          <span className={styles.search}>
            <Magnifier className={styles.searchIcon} />
            <span className={styles.searchLabel}>Search</span>
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
