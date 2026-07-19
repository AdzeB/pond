import { motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import styles from "./styles.module.css";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const RIPPLE_LIFETIME_MS = 1400;

/** Hidden in plain sight: clicking the pond's empty water sends out a gentle ripple. */
function useRipples() {
  const reduce = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const splash = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((r) => [
      ...r,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    window.setTimeout(() => {
      setRipples((r) => r.filter((ripple) => ripple.id !== id));
    }, RIPPLE_LIFETIME_MS);
  };

  return { ripples, splash };
}

/** The bobbing arrow points toward the dock where new saves land. */
export function WelcomeEmpty() {
  const reduce = useReducedMotion();
  const { ripples, splash } = useRipples();
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the ripple is a decorative easter egg; no functionality lives behind the click.
    // biome-ignore lint/a11y/useKeyWithClickEvents: purely decorative; there is nothing for keyboard users to trigger.
    <div className={styles.welcome} onClick={splash}>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={styles.splash}
          style={{ left: ripple.x, top: ripple.y }}
          aria-hidden
        >
          <span className={styles.ring} />
          <span className={styles.ring} data-ring="2" />
          <span className={styles.ring} data-ring="3" />
        </span>
      ))}
      <p className={styles.text}>
        No saves yet.
        <br />
        Drop a link, image, or file to get started.
      </p>
      <motion.span
        className={styles.arrow}
        aria-hidden
        animate={reduce ? undefined : { y: [0, 6, 0] }}
        transition={
          reduce
            ? undefined
            : {
                duration: 1.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
        }
      >
        <svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 2v18M3 13l7 7 7-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
    </div>
  );
}
