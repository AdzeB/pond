import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { Dock } from "@/components/library-view-menu-group";
import { useView } from "@/hooks/use-view";
import { snappySpring } from "@/lib/ui/motion";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/lib/ui/zoom";
import styles from "./styles.module.css";

const STEPS: ReadonlyArray<{ value: number; label: string }> = [
  { value: ZOOM_MIN, label: "Compact" },
  { value: 105, label: "Cozy" },
  { value: ZOOM_DEFAULT, label: "Comfortable" },
  { value: 155, label: "Relaxed" },
  { value: 185, label: "Spacious" },
  { value: ZOOM_MAX, label: "Roomy" },
];

function closestIndex(value: number): number {
  let best = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  STEPS.forEach((step, index) => {
    const delta = Math.abs(value - step.value);
    if (delta < bestDelta) {
      best = index;
      bestDelta = delta;
    }
  });
  return best;
}

export function ZoomSection() {
  const { state, actions } = useView();
  const groupId = useId();
  const reduceMotion = useReducedMotion();
  const activeIndex = closestIndex(state.zoom);
  const initialZoom = useRef(state.zoom);

  return (
    <Dock.Root>
      <Dock.Close />
      <Dock.Header>
        <Dock.Title>Library Zoom Level</Dock.Title>
        <Dock.Separator />
        <Dock.Description>
          Control how large items appear in your library. Pick a denser step to
          fit more on screen at once, or a roomier one for bigger,
          easier-to-scan cards.
        </Dock.Description>
      </Dock.Header>
      <ToggleGroup
        role="radiogroup"
        aria-label="Zoom"
        className={styles.options}
      >
        {STEPS.map((step, index) => {
          const active = index === activeIndex;
          return (
            <Toggle
              key={step.value}
              title={step.label}
              className={styles.toggle}
              onClick={() => actions.setZoom(step.value)}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  layoutId={`${groupId}-highlight`}
                  className={styles.highlight}
                  transition={reduceMotion ? { duration: 0 } : snappySpring}
                />
              ) : null}

              <span className={styles.label}>{step.label}</span>
            </Toggle>
          );
        })}
      </ToggleGroup>
      <Dock.Footer>
        <Dock.Cancel onClick={() => actions.setZoom(initialZoom.current)} />
        <Dock.Confirm />
      </Dock.Footer>
    </Dock.Root>
  );
}
