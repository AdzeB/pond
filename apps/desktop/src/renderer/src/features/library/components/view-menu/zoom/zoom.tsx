import { Select } from "@pond/ui";
import { useView } from "@/features/library/hooks/use-view";
import { nearestZoomIndex, ZOOM_STEPS } from "@/features/library/lib/zoom";
import styles from "../view-menu.module.css";

const options = [...ZOOM_STEPS];

export function ZoomSection() {
  const { state, actions } = useView();
  const selected = ZOOM_STEPS[nearestZoomIndex(state.zoom)];

  return (
    <Select.Root
      items={options}
      value={selected?.value}
      onValueChange={(value) => {
        if (value !== null) actions.setZoom(value);
      }}
    >
      <div className={styles.row}>
        <Select.Label className={styles.label}>Thumbnail Size</Select.Label>
        <Select.Trigger size="sm" className={styles.select}>
          <Select.Value />
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner align="end" sideOffset={6}>
          <Select.Popup>
            <Select.Items items={options} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
