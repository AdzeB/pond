import type { CSSProperties } from "react";
import { useView } from "@/hooks/use-view";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/lib/zoom";
import { Group } from "../../group";
import { Segmented, type SegmentedOption } from "../../segmented";
import styles from "../../styles.module.css";

const STEPS: ReadonlyArray<{ value: number; label: string }> = [
  { value: ZOOM_MIN, label: "Compact" },
  { value: 105, label: "Cozy" },
  { value: ZOOM_DEFAULT, label: "Comfortable" },
  { value: 185, label: "Spacious" },
  { value: ZOOM_MAX, label: "Roomy" },
];

function closest(value: number): number {
  let best = STEPS[0]?.value ?? ZOOM_DEFAULT;
  let bestDelta = Math.abs(value - best);
  for (const { value: step } of STEPS) {
    const delta = Math.abs(value - step);
    if (delta < bestDelta) {
      best = step;
      bestDelta = delta;
    }
  }
  return best;
}

const options: ReadonlyArray<SegmentedOption<number>> = STEPS.map(
  ({ value, label }, index) => ({
    value,
    label,
    icon: (
      <span
        aria-hidden
        className={styles.zoomDot}
        style={{ "--dot": `${6 + index * 3}px` } as CSSProperties}
      />
    ),
  }),
);

export function ZoomSection() {
  const { state, actions } = useView();
  const current = closest(state.zoom);
  const label = STEPS.find((step) => step.value === current)?.label;

  return (
    <Group title="Zoom" value={label}>
      <Segmented
        ariaLabel="Zoom"
        options={options}
        value={current}
        onChange={actions.setZoom}
        showLabels={false}
      />
    </Group>
  );
}
