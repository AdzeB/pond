import { Button, Popover, Select, Slider, Switch, Tooltip } from "@pond/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown, Minus, Plus } from "lucide-react";
import { useCallback } from "react";
import { type Density, useDensity } from "@/lib/density";
import {
  type DisplayPrefKey,
  setDisplayPref,
  useDisplayPrefs,
} from "@/lib/display-prefs";
import { patchSearch } from "@/lib/navigate-path";
import { useInspector } from "@/lib/use-inspector";
import { useSidebar } from "@/lib/use-sidebar";
import { useZoom, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/use-zoom";
import {
  isLayoutValue,
  type LayoutValue,
  readViewPref,
  writeViewPref,
} from "@/lib/view-prefs";
import styles from "./styles.module.css";

type SortKey = "savedAt" | "title" | "fileSize";
type SortDir = "asc" | "desc";

const LAYOUT_OPTIONS: Array<{ value: LayoutValue; label: string }> = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "savedAt", label: "Date saved" },
  { value: "title", label: "Title" },
  { value: "fileSize", label: "Size" },
];

const DISPLAY_TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show name" },
  { key: "date", label: "Show date" },
  { key: "fileCount", label: "Show file count" },
  { key: "sourceBadge", label: "Show source badge" },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

const DENSITY_VALUES = new Set<Density>(["compact", "comfortable", "spacious"]);

const SORT_VALUES = new Set<SortKey>(["savedAt", "title", "fileSize"]);

interface ViewPickerProps {
  trigger: React.ReactElement;
}

function useLayoutValue(): [LayoutValue, (next: LayoutValue) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const raw =
    (search.view as string | undefined) ?? readViewPref("view") ?? "waterfall";
  const value: LayoutValue = isLayoutValue(raw) ? raw : "waterfall";

  const set = useCallback(
    (next: LayoutValue) => {
      writeViewPref("view", next);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next === "waterfall") delete out.view;
          else out.view = next;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  return [value, set];
}

function useSortState(): {
  sortKey: SortKey;
  sortDir: SortDir;
  setSortKey: (next: SortKey) => void;
  setSortDir: (next: SortDir) => void;
} {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const rawKey =
    (search.sort as string | undefined) ?? readViewPref("sort") ?? "savedAt";
  const sortKey: SortKey = SORT_VALUES.has(rawKey as SortKey)
    ? (rawKey as SortKey)
    : "savedAt";

  const rawDir = (search.dir as string | undefined) ?? readViewPref("dir");
  const sortDir: SortDir = rawDir === "asc" ? "asc" : "desc";

  const setSortKey = useCallback(
    (next: SortKey) => {
      writeViewPref("sort", next);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next === "savedAt") delete out.sort;
          else out.sort = next;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  const setSortDir = useCallback(
    (next: SortDir) => {
      writeViewPref("dir", next);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next === "desc") delete out.dir;
          else out.dir = next;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  return { sortKey, sortDir, setSortKey, setSortDir };
}

export function ViewPicker({ trigger }: ViewPickerProps) {
  const [layout, setLayout] = useLayoutValue();
  const { sortKey, sortDir, setSortKey, setSortDir } = useSortState();
  const prefs = useDisplayPrefs();
  const [density, setDensity] = useDensity();
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const { open: inspectorOpen, setOpen: setInspectorOpen } = useInspector();

  return (
    <Popover.Root>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6}>
          <Popover.Popup className={styles.popup}>
            <Row label="Layout">
              <Select.Root
                value={layout}
                onValueChange={(v) => {
                  if (typeof v === "string" && isLayoutValue(v)) {
                    setLayout(v);
                  }
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      {LAYOUT_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Row>

            <Row label="Sort by">
              <span className={styles["sort-controls"]}>
                <Select.Root
                  value={sortKey}
                  onValueChange={(v) => {
                    if (
                      typeof v === "string" &&
                      SORT_VALUES.has(v as SortKey)
                    ) {
                      setSortKey(v as SortKey);
                    }
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Icon>
                      <ChevronsUpDown />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={6}>
                      <Select.Popup>
                        {SORT_OPTIONS.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            {opt.label}
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
                <fieldset className={styles["dir-group"]}>
                  <legend className={styles["sr-only"]}>Sort direction</legend>
                  <Tooltip label="Ascending" side="bottom">
                    <button
                      type="button"
                      aria-label="Sort ascending"
                      aria-pressed={sortDir === "asc"}
                      className={styles["dir-btn"]}
                      onClick={() => setSortDir("asc")}
                    >
                      <ArrowUp width="0.85em" height="0.85em" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Descending" side="bottom">
                    <button
                      type="button"
                      aria-label="Sort descending"
                      aria-pressed={sortDir === "desc"}
                      className={styles["dir-btn"]}
                      onClick={() => setSortDir("desc")}
                    >
                      <ArrowDown width="0.85em" height="0.85em" />
                    </button>
                  </Tooltip>
                </fieldset>
              </span>
            </Row>

            <Row label="Density">
              <Select.Root
                value={density}
                onValueChange={(v) => {
                  if (
                    typeof v === "string" &&
                    DENSITY_VALUES.has(v as Density)
                  ) {
                    setDensity(v as Density);
                  }
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      {DENSITY_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Row>

            <Row label="Zoom">
              <ZoomControl />
            </Row>

            <hr className={styles.separator} />

            {DISPLAY_TOGGLES.map(({ key, label }) => (
              <Row key={key} label={label}>
                <Switch.Root
                  checked={prefs[key]}
                  onCheckedChange={(v) => setDisplayPref(key, Boolean(v))}
                />
              </Row>
            ))}

            <hr className={styles.separator} />

            <Row label="Show sidebar">
              <Switch.Root
                checked={sidebarOpen}
                onCheckedChange={(v) => setSidebarOpen(Boolean(v))}
              />
            </Row>
            <Row label="Show inspector">
              <Switch.Root
                checked={inspectorOpen}
                onCheckedChange={(v) => setInspectorOpen(Boolean(v))}
              />
            </Row>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div className={styles.row}>
      <span className={styles["row-label"]}>{label}</span>
      <span className={styles["row-control"]}>{children}</span>
    </div>
  );
}

function ZoomControl() {
  const [value, setValue] = useZoom();
  const step = useCallback(
    (delta: number) => setValue(value + delta),
    [setValue, value],
  );

  return (
    <fieldset className={styles.zoom}>
      <legend className={styles["sr-only"]}>Grid zoom</legend>
      <Button
        icon
        variant="ghost"
        size="xs"
        aria-label="Smaller cards"
        onClick={() => step(-ZOOM_STEP)}
        disabled={value <= ZOOM_MIN}
      >
        <Minus size={12} />
      </Button>
      <Slider.Root
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={value}
        onValueChange={(next) => {
          const n = typeof next === "number" ? next : next[0];
          if (n !== undefined) setValue(n);
        }}
        className={styles["zoom-slider"]}
      >
        <Slider.Control className={styles["zoom-slider-control"]}>
          <Slider.Track className={styles["zoom-slider-track"]}>
            <Slider.Indicator className={styles["zoom-slider-indicator"]} />
            <Slider.Thumb
              aria-label="Grid zoom"
              className={styles["zoom-slider-thumb"]}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <Button
        icon
        variant="ghost"
        size="xs"
        aria-label="Larger cards"
        onClick={() => step(ZOOM_STEP)}
        disabled={value >= ZOOM_MAX}
      >
        <Plus size={12} />
      </Button>
    </fieldset>
  );
}
