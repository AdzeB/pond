import { Select, Switch } from "@pond/ui";
import { useId } from "react";
import {
  GAP_STEPS,
  nearestGap,
  setLibrarySaveGap,
  useLibrarySaveGap,
} from "@/features/library/components/layouts/save-gap";
import type { SortDir } from "@/features/library/hooks/use-filtered-saves";
import { useView } from "@/features/library/hooks/use-view";
import type { LayoutValue } from "@/features/library/lib/view-prefs";
import { nearestZoomIndex, ZOOM_STEPS } from "@/features/library/lib/zoom";
import {
  libraryChrome,
  useRightPane,
  useSidebarOpen,
} from "@/features/library/state/library-chrome";
import {
  setIncludeSubfolders,
  useIncludeSubfolders,
} from "@/features/library/state/view-store";
import {
  type ItemInfoField,
  setItemInfoField,
  setItemInfoVisible,
  setListColumn,
  useItemInfo,
  useListColumns,
} from "@/features/saves";
import { usePrefs } from "@/shared/state/prefs";
import { SORT_OPTIONS } from "../sort";
import styles from "./styles.module.css";

const LAYOUT_OPTIONS: Array<{ value: LayoutValue; label: string }> = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

const INFO_OPTIONS: Array<{
  value: ItemInfoField;
  label: string;
}> = [
  { value: "dimensions", label: "Dimensions" },
  { value: "fileSize", label: "File Size" },
  { value: "tags", label: "Tags" },
  { value: "rating", label: "Rating" },
  { value: "modified", label: "Date Modified" },
  { value: "created", label: "Date Created" },
];

const QUALITY_OPTIONS: Array<{
  value: "fast" | "balanced" | "quality";
  label: string;
}> = [
  { value: "fast", label: "Speed" },
  { value: "balanced", label: "Balanced" },
  { value: "quality", label: "Quality" },
];
const FIT_OPTIONS: Array<{ value: "fit" | "fill"; label: string }> = [
  { value: "fit", label: "Fit" },
  { value: "fill", label: "Fill" },
];
const SIZE_OPTIONS = [...ZOOM_STEPS];
const GAP_OPTIONS = [...GAP_STEPS];
const DIRECTION_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export function LayoutOptions() {
  const { state, actions } = useView();
  const [viewer, patchViewer] = usePrefs("viewer");
  const itemInfo = useItemInfo();
  const gap = nearestGap(useLibrarySaveGap());
  const size = ZOOM_STEPS[nearestZoomIndex(state.zoom)] ?? SIZE_OPTIONS[0];

  return (
    <div className={styles.rows}>
      <Select.Root
        items={LAYOUT_OPTIONS}
        value={state.layout}
        onValueChange={(value) => {
          if (value !== null) actions.setLayout(value);
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Layout</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={LAYOUT_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        items={SIZE_OPTIONS}
        value={size?.value}
        onValueChange={(value) => {
          if (value !== null) actions.setZoom(value);
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Size</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={SIZE_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        items={GAP_OPTIONS}
        value={gap}
        onValueChange={(value) => {
          if (value !== null) setLibrarySaveGap(value);
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Gap</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={GAP_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        items={QUALITY_OPTIONS}
        value={viewer.thumbnailQuality}
        onValueChange={(value) => {
          if (value === "fast" || value === "balanced" || value === "quality") {
            void patchViewer({ thumbnailQuality: value });
          }
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>
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
      <Select.Root
        items={FIT_OPTIONS}
        value={viewer.galleryFit}
        onValueChange={(value) => {
          if (value === "fit" || value === "fill") {
            void patchViewer({ galleryFit: value });
          }
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Thumbnail Fit</Select.Label>
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
        items={INFO_OPTIONS}
        value={itemInfo.field}
        onValueChange={(value) => {
          if (value) setItemInfoField(value);
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Item Info</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={INFO_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export function SortOptions() {
  const { state, actions } = useView();

  return (
    <div className={styles.rows}>
      <Select.Root
        items={DIRECTION_OPTIONS}
        value={state.sort.dir}
        onValueChange={(value) => {
          if (value === "asc" || value === "desc") {
            actions.setSort({ key: state.sort.key, dir: value });
          }
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Direction</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={DIRECTION_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        items={SORT_OPTIONS}
        value={state.sort.key}
        onValueChange={(value) => {
          if (value) actions.setSort({ key: value, dir: state.sort.dir });
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.rowLabel}>Sort</Select.Label>
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={SORT_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export function DisplayOptions() {
  const { state, actions } = useView();
  const includeSubfolders = useIncludeSubfolders();
  const sidebarOpen = useSidebarOpen();
  const inspectorOn = useRightPane() === "inspector";
  const listColumns = useListColumns();
  const itemInfo = useItemInfo();
  const id = useId();
  const list = state.layout === "list";
  const nameOn = list ? listColumns.name : state.displayPrefs.name;

  function setName(checked: boolean) {
    if (list) setListColumn("name", checked);
    else actions.setDisplayPref("name", checked);
  }

  return (
    <div className={styles.rows}>
      <label className={styles.row} htmlFor={`${id}-name`}>
        <span className={styles.rowLabel}>Show Name</span>
        <Switch.Root
          id={`${id}-name`}
          checked={nameOn}
          onCheckedChange={setName}
        />
      </label>
      <label className={styles.row} htmlFor={`${id}-info`}>
        <span className={styles.rowLabel}>Show Item Info</span>
        <Switch.Root
          id={`${id}-info`}
          checked={itemInfo.visible}
          onCheckedChange={setItemInfoVisible}
        />
      </label>
      <label className={styles.row} htmlFor={`${id}-extension`}>
        <span className={styles.rowLabel}>Show Extension</span>
        <Switch.Root
          id={`${id}-extension`}
          checked={state.displayPrefs.type}
          onCheckedChange={(checked) => actions.setDisplayPref("type", checked)}
        />
      </label>
      <label className={styles.row} htmlFor={`${id}-subfolders`}>
        <span className={styles.rowLabel}>Show Subfolder Contents</span>
        <Switch.Root
          id={`${id}-subfolders`}
          checked={includeSubfolders}
          onCheckedChange={setIncludeSubfolders}
        />
      </label>
      <hr className={styles.separator} />
      <label className={styles.row} htmlFor={`${id}-sidebar`}>
        <span className={styles.rowLabel}>Show Sidebar</span>
        <Switch.Root
          id={`${id}-sidebar`}
          checked={sidebarOpen}
          onCheckedChange={(checked) => {
            if (checked !== sidebarOpen) libraryChrome.toggleSidebar();
          }}
        />
      </label>
      <label className={styles.row} htmlFor={`${id}-inspector`}>
        <span className={styles.rowLabel}>Show Inspector</span>
        <Switch.Root
          id={`${id}-inspector`}
          checked={inspectorOn}
          onCheckedChange={(checked) => {
            if (checked === inspectorOn) return;
            if (checked) libraryChrome.toggleInspector();
            else libraryChrome.closeRightPane();
          }}
        />
      </label>
    </div>
  );
}
