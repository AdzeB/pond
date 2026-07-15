import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { TrayCard } from "@pond/ui";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { useView } from "@/hooks/use-view";
import { snappySpring } from "@/lib/ui/motion";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/lib/ui/zoom";
import styles from "./styles.module.css";

const STEPS: ReadonlyArray<{ value: number; label: string }> = [
  { value: ZOOM_MIN, label: "Tiny" },
  { value: 105, label: "Small" },
  { value: ZOOM_DEFAULT, label: "Medium" },
  { value: 155, label: "Large" },
  { value: 185, label: "Huge" },
  { value: ZOOM_MAX, label: "Giant" },
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
    <>
      <TrayCard.Close />
      <TrayCard.Header>
        <TrayCard.Title>Library Zoom Level</TrayCard.Title>
        <TrayCard.Separator />
        <TrayCard.Description>
          Control how large items appear in your library. Pick a denser step to
          fit more on screen at once, or a roomier one for bigger,
          easier-to-scan cards.
        </TrayCard.Description>
      </TrayCard.Header>
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
      <TrayCard.Footer>
        <TrayCard.Cancel onClick={() => actions.setZoom(initialZoom.current)} />
        <TrayCard.Confirm />
      </TrayCard.Footer>
    </>
  );
}
