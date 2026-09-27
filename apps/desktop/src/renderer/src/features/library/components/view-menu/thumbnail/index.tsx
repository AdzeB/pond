import { Select } from "@pond/ui";
import { usePrefs } from "@/features/settings/state/prefs";
import styles from "./styles.module.css";

const FIT_OPTIONS: Array<{ value: "fit" | "fill"; label: string }> = [
  { value: "fit", label: "Fit" },
  { value: "fill", label: "Fill" },
];

const QUALITY_OPTIONS: Array<{
  value: "fast" | "balanced" | "quality";
  label: string;
}> = [
  { value: "fast", label: "Fast" },
  { value: "balanced", label: "Balanced" },
  { value: "quality", label: "Quality" },
];

export function ThumbnailSection() {
  const [viewer, patchViewer] = usePrefs("viewer");
  return (
    <div className={styles.rows}>
      <Select.Root
        items={FIT_OPTIONS}
        value={viewer.galleryFit}
        onValueChange={(galleryFit) => {
          if (galleryFit) void patchViewer({ galleryFit });
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.label}>Thumbnail Fit</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={FIT_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        items={QUALITY_OPTIONS}
        value={viewer.thumbnailQuality}
        onValueChange={(thumbnailQuality) => {
          if (thumbnailQuality) void patchViewer({ thumbnailQuality });
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.label}>
            Thumbnail Quality
          </Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={QUALITY_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
