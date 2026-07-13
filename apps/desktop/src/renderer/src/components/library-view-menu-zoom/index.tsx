import { Slider } from "@pond/ui";
import { Group } from "@/components/library-view-menu-group";
import { useView } from "@/hooks/use-view";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/lib/ui/zoom";
import styles from "./styles.module.css";

const STEPS: ReadonlyArray<{ value: number; label: string }> = [
  { value: ZOOM_MIN, label: "Compact" },
  { value: 105, label: "Cozy" },
  { value: ZOOM_DEFAULT, label: "Comfortable" },
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

/** Index-driven slider that snaps to the five named density steps. */
export function ZoomSection() {
  const { state, actions } = useView();
  const index = closestIndex(state.zoom);
  const label = STEPS[index]?.label;

  return (
    <Group title="Zoom" value={label} changed={state.zoom !== ZOOM_DEFAULT}>
      <div className={styles["zoom-row"]}>
        <span className={styles["zoom-cue"]} data-size="sm" aria-hidden />
        <Slider.Root
          className={styles["zoom-slider"]}
          aria-label="Zoom"
          min={0}
          max={STEPS.length - 1}
          step={1}
          value={index}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (next == null) return;
            const step = STEPS[next];
            if (step) actions.setZoom(step.value);
          }}
        >
          <Slider.Control className={styles["zoom-control"]}>
            <Slider.Track className={styles["zoom-track"]}>
              <Slider.Indicator className={styles["zoom-indicator"]} />
              <Slider.Thumb className={styles["zoom-thumb"]} />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <span className={styles["zoom-cue"]} data-size="lg" aria-hidden />
      </div>
    </Group>
  );
}
