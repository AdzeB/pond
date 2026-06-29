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

// Zoom is a discrete, index-driven slider that snaps to the five named density
// steps. The growing squares on each end carry the small -> roomy metaphor, and
// the active step's name reads in the group header.
export function ZoomSection() {
  const { state, actions } = useView();
  const index = closestIndex(state.zoom);
  const label = STEPS[index]?.label;

  return (
    <Group title="Zoom" value={label} changed={state.zoom !== ZOOM_DEFAULT}>
      <div className={styles.zoomRow}>
        <span className={styles.zoomCue} data-size="sm" aria-hidden />
        <Slider.Root
          className={styles.zoomSlider}
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
          <Slider.Control className={styles.zoomControl}>
            <Slider.Track className={styles.zoomTrack}>
              <Slider.Indicator className={styles.zoomIndicator} />
              <Slider.Thumb className={styles.zoomThumb} />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <span className={styles.zoomCue} data-size="lg" aria-hidden />
      </div>
    </Group>
  );
}
