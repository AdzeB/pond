import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { TrayCard } from "@pond/ui";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import { useView } from "@/hooks/use-view";
import { snappySpring } from "@/lib/ui/motion";
import { nearestZoomIndex, ZOOM_STEPS } from "@/lib/ui/zoom";
import styles from "./styles.module.css";

export function ZoomSection() {
  const dock = useDock();
  const { state, actions } = useView();
  const groupId = useId();
  const reduceMotion = useReducedMotion();
  const activeIndex = nearestZoomIndex(state.zoom);
  const initialZoom = useRef(state.zoom);

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back onClick={() => dock.openViewMenu("options")} />
        <TrayCard.Title position="center">Zoom</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Control how large items appear in your library.
        </TrayCard.Description>
      </TrayCard.Header>
      <ToggleGroup
        role="radiogroup"
        aria-label="Zoom"
        className={styles.options}
      >
        {ZOOM_STEPS.map((step, index) => {
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
