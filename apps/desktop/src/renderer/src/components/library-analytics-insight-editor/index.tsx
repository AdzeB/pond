import {
  IconChartAreaOutline18 as AreaIcon,
  IconChartColumnOutline18 as ChartIcon,
  IconChevronDownOutline18 as ChevronDown,
  IconHashtagOutline18 as HashIcon,
  IconCalendarGridOutline18 as HeatmapIcon,
  IconChartLineOutline18 as LineIcon,
  IconChartPieOutline18 as PieIcon,
  IconChartRadarOutline18 as RadarIcon,
  IconChartDonutOutline18 as RingIcon,
  IconChartDonut2Outline18 as SunburstIcon,
  IconTableOutline18 as TableIcon,
  IconXmarkOutline18 as Xmark,
} from "@pond/icons/outline/18";
import type {
  InsightConfig,
  InsightDisplay,
  InsightSegment,
  InsightSlice,
  InsightVizOptions,
} from "@pond/schema/db";
import {
  Accordion,
  Button,
  Dialog,
  Slider,
  Switch,
  Toggle,
  ToggleGroup,
} from "@pond/ui";
import { useMemo, useRef, useState } from "react";
import { EnumSelect } from "@/components/enum-select";
import { FilterBar } from "@/components/library-analytics/filter-bar";
import { InsightBody } from "@/components/library-analytics/insight-body";
import {
  applyFilters,
  autoTitle,
  computeInsight,
  DISPLAY_OPTIONS,
  defaultSize,
  GRID_COLS,
  GRID_MAX_ROWS,
  insightTitle,
  SEGMENT_OPTIONS,
  SLICE_OPTIONS,
  sizeOf,
} from "@/components/library-analytics/lib/insights";
import {
  layersFor,
  layerVisible,
} from "@/components/library-analytics/lib/layers";
import { insightEditor, useInsightEditorState } from "@/stores/insight-editor";
import styles from "./styles.module.css";

// Insight editor as a full-page takeover:
// a single left pane of collapsible sections — General (data + placement),
// one style section per configurable layer, and a Layers visibility list —
// with the rest of the window a dotted canvas where the draft renders as a
// live card. The draft lives in the insight-editor store; the analytics
// page persists it on save.

const NONE = "__none__";
type SegmentValue = InsightSegment | typeof NONE;

// Floating preview mirrors the grid's cell metrics (~3 columns of the 960px
// dashboard) so the card previews at its real size.
const CELL_W = 240;
const ROW_H = 128;
const GAP = 12;

const DISPLAY_ICONS: Record<
  InsightDisplay,
  React.ComponentType<{ width?: number; height?: number }>
> = {
  chart: ChartIcon,
  area: AreaIcon,
  line: LineIcon,
  ring: RingIcon,
  pie: PieIcon,
  sunburst: SunburstIcon,
  radar: RadarIcon,
  heatmap: HeatmapIcon,
  metric: HashIcon,
  table: TableIcon,
};

// Displays that don't chart per-slice groups; slice/segment don't apply.
const NO_SLICE_DISPLAYS = new Set<InsightDisplay>(["heatmap", "metric"]);

// Single-hue shapes color by slice, so a segment would be invisible.
const NO_SEGMENT_DISPLAYS = new Set<InsightDisplay>([
  ...NO_SLICE_DISPLAYS,
  "ring",
  "pie",
  "radar",
]);

const CURVE_OPTIONS: {
  value: NonNullable<InsightVizOptions["curve"]>;
  label: string;
}[] = [
  { value: "smooth", label: "Smooth" },
  { value: "linear", label: "Linear" },
  { value: "step", label: "Stepped" },
];

const FILL_OPTIONS: {
  value: NonNullable<InsightVizOptions["fill"]>;
  label: string;
}[] = [
  { value: "gradient", label: "Gradient" },
  { value: "dotted", label: "Dotted" },
  { value: "none", label: "None" },
];

// Display picker menu items: icon + label.
const displayOptions = DISPLAY_OPTIONS.map(({ value, label }) => {
  const Icon = DISPLAY_ICONS[value];
  return {
    value,
    label: (
      <span className={styles["display-option"]}>
        <Icon width={15} height={15} />
        {label}
      </span>
    ),
  };
});

function sliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

// Table-picker style size control: a mini 4×4 grid whose cells mirror the
// dashboard's cell proportions. Hover previews a span, click commits it.
function SizePicker({
  w,
  h,
  onChange,
}: {
  w: number;
  h: number;
  onChange: (w: number, h: number) => void;
}) {
  const [hover, setHover] = useState<{ w: number; h: number } | null>(null);
  const shown = hover ?? { w, h };

  return (
    <div className={styles.field}>
      <span className={styles["field-label"]}>
        Size{" "}
        <small>
          {shown.w} × {shown.h}
        </small>
      </span>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only preview reset; the cell buttons carry the interactions. */}
      <div
        className={styles["size-grid"]}
        data-previewing={hover != null || undefined}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: GRID_MAX_ROWS }, (_, r) => r + 1).map((row) =>
          Array.from({ length: GRID_COLS }, (_, c) => c + 1).map((col) => (
            <button
              key={`${col}x${row}`}
              type="button"
              className={styles["size-cell"]}
              data-active={(col <= w && row <= h) || undefined}
              data-preview={
                (hover != null && col <= hover.w && row <= hover.h) || undefined
              }
              aria-label={`${col} column${col === 1 ? "" : "s"} × ${row} row${row === 1 ? "" : "s"}`}
              aria-pressed={w === col && h === row}
              onMouseEnter={() => setHover({ w: col, h: row })}
              onFocus={() => setHover({ w: col, h: row })}
              onBlur={() => setHover(null)}
              onClick={() => onChange(col, row)}
            />
          )),
        )}
      </div>
    </div>
  );
}

// One labelled single-select toggle row for the properties panel. Base UI
// lets a lone pressed toggle be unpressed (empty group value); ignoring the
// empty pick keeps exactly one option active.
function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; ariaLabel?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles["field-label"]}>{label}</span>
      <ToggleGroup
        value={[value]}
        aria-label={label}
        className={styles["field-seg"]}
        onValueChange={(next) => {
          const pick = next[0] as T | undefined;
          if (pick && pick !== value) onChange(pick);
        }}
      >
        {options.map((option) => (
          <Toggle
            key={option.value}
            value={option.value}
            size="sm"
            aria-label={option.ariaLabel}
          >
            {option.label}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

// One collapsible sidebar section: a bold header row with a rotating
// chevron, fields stacked beneath.
function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item value={id} className={styles.section}>
      <Accordion.Header className={styles["section-header"]}>
        <Accordion.Trigger className={styles["section-trigger"]}>
          {label}
          <ChevronDown
            width={14}
            height={14}
            className={styles["section-chevron"]}
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className={styles["section-panel"]}>
        <div className={styles["section-fields"]}>{children}</div>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

// One labelled slider row for the properties panel.
function KnobSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles["field-label"]}>{label}</span>
      <div className={styles.knob}>
        <Slider.Root
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={(next) => onChange(sliderValue(next))}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb aria-label={label} />
            </Slider.Track>
          </Slider.Control>
          <Slider.Value />
        </Slider.Root>
      </div>
    </div>
  );
}

export function InsightEditorDialog() {
  const { draft, isNew, saves, days } = useInsightEditorState();

  // Keep rendering the last draft during the overlay's exit transition —
  // save/cancel clear the store before the popup finishes animating out.
  const lastDraft = useRef<InsightConfig | null>(draft);
  if (draft) lastDraft.current = draft;
  const config = draft ?? lastDraft.current;

  const segmentOptions = useMemo(
    () => [
      { value: NONE as SegmentValue, label: "No value" },
      ...SEGMENT_OPTIONS.filter((o) => o.value !== config?.slice).map((o) => ({
        value: o.value as SegmentValue,
        label: o.label,
      })),
    ],
    [config?.slice],
  );

  const data = useMemo(
    () =>
      config
        ? computeInsight(config, applyFilters(saves, config.filters), days)
        : null,
    [config, saves, days],
  );

  // Before the first draft there's nothing to render, but the (closed) root
  // must still mount: Base UI only plays enter transitions when `open` flips
  // while the root is mounted, so a root that mounts already-open snaps into
  // place with no animation.
  if (!config || !data) {
    return (
      <Dialog.Root open={false}>
        <Dialog.Portal />
      </Dialog.Root>
    );
  }

  const size = sizeOf(config);
  const sliceDisabled = NO_SLICE_DISPLAYS.has(config.display);
  const segmentDisabled = NO_SEGMENT_DISPLAYS.has(config.display);

  // Every hideable layer gets a section (its Enabled switch lives there);
  // locked layers only appear when they have style knobs to offer.
  const sectionLayers = layersFor(config.display).filter(
    (l) => !l.locked || layerHasKnobs(config.display, l.id),
  );

  const patchViz = (patch: Partial<InsightVizOptions>) =>
    insightEditor.patch({ viz: { ...config.viz, ...patch } });

  const toggleLayer = (id: string) => {
    // Area/line points predate the layers system and live in `viz.points`.
    if (
      (config.display === "area" || config.display === "line") &&
      id === "points"
    ) {
      patchViz({ points: !(config.viz?.points ?? false) });
      return;
    }
    const hidden = new Set(config.viz?.hidden ?? []);
    if (layerVisible(config.display, config.viz, id)) {
      hidden.add(id);
      patchViz({ hidden: [...hidden] });
    } else {
      hidden.delete(id);
      // `fill: "none"` predates the eye; restore a real fill on unhide.
      const revive =
        config.display === "area" &&
        id === "fill" &&
        (config.viz?.fill ?? "gradient") === "none";
      patchViz({
        hidden: [...hidden],
        ...(revive ? { fill: "gradient" as const } : {}),
      });
    }
  };

  return (
    <Dialog.Root
      open={draft != null}
      onOpenChange={(open) => {
        if (!open) insightEditor.cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup className={styles.popup}>
          <aside className={styles.sidebar}>
            <header className={styles.header}>
              <Dialog.Title className={styles["header-title"]}>
                {isNew ? "New insight" : "Edit insight"}
              </Dialog.Title>
              <Dialog.Close
                className={styles["header-button"]}
                aria-label="Cancel"
              >
                <Xmark width={14} height={14} />
              </Dialog.Close>
            </header>

            <div className={styles.body}>
              <Accordion.Root
                key={config.id}
                multiple
                defaultValue={["general"]}
                className={styles.sections}
              >
                <Section id="general" label="General">
                  <div className={styles.field}>
                    <span className={styles["field-label"]}>Display</span>
                    <EnumSelect<InsightDisplay>
                      value={config.display}
                      options={displayOptions}
                      aria-label="Display type"
                      onValueChange={(display) =>
                        insightEditor.patch({
                          display,
                          // New drafts pick up the display's natural grid
                          // size; placed cards keep whatever the user set.
                          ...(isNew ? defaultSize(display) : {}),
                          // A sunburst is defined by its second level; give
                          // it one if the draft lacks a usable segment.
                          ...(display === "sunburst" &&
                          (!config.segment || config.segment === config.slice)
                            ? {
                                segment:
                                  SEGMENT_OPTIONS.find(
                                    (o) => o.value !== config.slice,
                                  )?.value ?? null,
                              }
                            : {}),
                        })
                      }
                      className={styles["field-select"]}
                    />
                  </div>

                  <div className={styles.field}>
                    <span className={styles["field-label"]}>Title</span>
                    <input
                      className={styles.name}
                      value={config.name ?? ""}
                      placeholder={autoTitle(config)}
                      aria-label="Insight name"
                      onChange={(e) =>
                        insightEditor.patch({
                          name: e.target.value === "" ? null : e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className={styles["field-row"]}>
                    <div className={styles.field}>
                      <span className={styles["field-label"]}>Slice by</span>
                      <EnumSelect<InsightSlice>
                        value={config.slice}
                        options={SLICE_OPTIONS}
                        disabled={sliceDisabled}
                        onValueChange={(slice) =>
                          insightEditor.patch({
                            slice,
                            // A segment equal to the new slice is meaningless.
                            segment:
                              config.segment === slice ? null : config.segment,
                          })
                        }
                        className={styles["field-select"]}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles["field-label"]}>
                        Segment by <small>(optional)</small>
                      </span>
                      <EnumSelect<SegmentValue>
                        value={config.segment ?? NONE}
                        options={segmentOptions}
                        disabled={segmentDisabled}
                        onValueChange={(segment) =>
                          insightEditor.patch({
                            segment: segment === NONE ? null : segment,
                          })
                        }
                        className={styles["field-select"]}
                      />
                    </div>
                  </div>

                  <SizePicker
                    w={size.w}
                    h={size.h}
                    onChange={(w, h) => insightEditor.patch({ w, h })}
                  />

                  <div className={styles.field}>
                    <span className={styles["field-label"]}>
                      Filter <small>(optional)</small>
                    </span>
                    <FilterBar
                      filters={config.filters}
                      saves={saves}
                      onChange={(filters) => insightEditor.patch({ filters })}
                    />
                  </div>
                </Section>

                {sectionLayers.map((layer) => {
                  const visible = layerVisible(
                    config.display,
                    config.viz,
                    layer.id,
                  );
                  return (
                    <Section
                      key={`${config.display}-${layer.id}`}
                      id={`layer-${layer.id}`}
                      label={layer.label}
                    >
                      {layer.locked ? null : (
                        <div className={styles["field-inline"]}>
                          <span className={styles["field-label"]}>Enabled</span>
                          <Switch.Root
                            checked={visible}
                            aria-label={`Show ${layer.label}`}
                            onCheckedChange={() => toggleLayer(layer.id)}
                          />
                        </div>
                      )}
                      {visible
                        ? layerKnobs(
                            config.display,
                            layer.id,
                            config.viz,
                            patchViz,
                          )
                        : null}
                    </Section>
                  );
                })}
              </Accordion.Root>
            </div>

            <div className={styles.foot}>
              <Button
                variant="primary"
                style={{ width: "100%" }}
                onClick={() => insightEditor.save()}
              >
                {isNew ? "Create" : "Save"}
              </Button>
              <Button
                variant="secondary"
                style={{ width: "100%" }}
                onClick={() => insightEditor.cancel()}
              >
                Cancel
              </Button>
            </div>
          </aside>

          <div className={styles.stage}>
            <section
              className={styles.preview}
              aria-label="Insight preview"
              style={{
                width: size.w * CELL_W + (size.w - 1) * GAP,
                height: size.h * ROW_H + (size.h - 1) * GAP,
              }}
            >
              <div className={styles["preview-title"]}>
                {insightTitle(config)}
              </div>
              {data.saveCount === 0 ? (
                <div className={styles["preview-empty"]}>
                  No saves match this window yet.
                </div>
              ) : (
                <div className={styles["preview-body"]}>
                  <InsightBody config={config} data={data} days={days} />
                </div>
              )}
            </section>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Which (display, layer) pairs have style knobs — these get their own
// sidebar section.
function layerHasKnobs(display: InsightDisplay, layerId: string): boolean {
  return (
    ((display === "area" || display === "line") && layerId === "line") ||
    (display === "area" && layerId === "fill") ||
    (display === "chart" && layerId === "bars") ||
    ((display === "ring" || display === "sunburst") && layerId === "wheel") ||
    (display === "radar" && (layerId === "polygon" || layerId === "grid"))
  );
}

// Style knobs for a (display, layer) pair; null when the layer has none.
function layerKnobs(
  display: InsightDisplay,
  layerId: string,
  viz: InsightVizOptions | undefined,
  patchViz: (patch: Partial<InsightVizOptions>) => void,
): React.ReactNode {
  const knobs: React.ReactNode[] = [];

  if ((display === "area" || display === "line") && layerId === "line") {
    knobs.push(
      <div key="curve" className={styles.field}>
        <span className={styles["field-label"]}>Curve</span>
        <EnumSelect<NonNullable<InsightVizOptions["curve"]>>
          value={viz?.curve ?? "smooth"}
          options={CURVE_OPTIONS}
          onValueChange={(curve) => patchViz({ curve })}
          className={styles["field-select"]}
        />
      </div>,
      <KnobSlider
        key="line-width"
        label="Line width"
        min={1}
        max={4}
        step={0.25}
        value={viz?.lineWidth ?? 1.75}
        onChange={(lineWidth) => patchViz({ lineWidth })}
      />,
    );
  }

  if (display === "area" && layerId === "fill") {
    knobs.push(
      <div key="fill" className={styles.field}>
        <span className={styles["field-label"]}>Style</span>
        <EnumSelect<NonNullable<InsightVizOptions["fill"]>>
          value={viz?.fill ?? "gradient"}
          options={FILL_OPTIONS}
          onValueChange={(fill) => patchViz({ fill })}
          className={styles["field-select"]}
        />
      </div>,
      <KnobSlider
        key="fill-opacity"
        label="Opacity"
        min={0.05}
        max={0.9}
        step={0.05}
        value={viz?.fillOpacity ?? (viz?.fill === "dotted" ? 0.45 : 0.35)}
        onChange={(fillOpacity) => patchViz({ fillOpacity })}
      />,
    );
  }

  if (display === "chart" && layerId === "bars") {
    knobs.push(
      <Seg
        key="bar-cap"
        label="Caps"
        value={viz?.barCap ?? "round"}
        options={[
          { value: "round", label: "Rounded" },
          { value: "square", label: "Square" },
        ]}
        onChange={(barCap) => patchViz({ barCap })}
      />,
    );
  }

  if ((display === "ring" || display === "sunburst") && layerId === "wheel") {
    knobs.push(
      <KnobSlider
        key="thickness"
        label="Thickness"
        min={6}
        max={display === "ring" ? 36 : 24}
        step={1}
        value={viz?.thickness ?? (display === "ring" ? 17 : 15)}
        onChange={(thickness) => patchViz({ thickness })}
      />,
    );
  }

  if (display === "radar" && layerId === "polygon") {
    knobs.push(
      <KnobSlider
        key="radar-fill"
        label="Fill opacity"
        min={0}
        max={0.6}
        step={0.02}
        value={viz?.fillOpacity ?? 0.18}
        onChange={(fillOpacity) => patchViz({ fillOpacity })}
      />,
    );
  }

  if (display === "radar" && layerId === "grid") {
    knobs.push(
      <Seg
        key="grid-levels"
        label="Levels"
        value={String(viz?.gridLevels ?? 3)}
        options={[2, 3, 4, 5].map((n) => ({
          value: String(n),
          label: String(n),
          ariaLabel: `${n} grid levels`,
        }))}
        onChange={(n) => patchViz({ gridLevels: Number(n) })}
      />,
    );
  }

  return knobs.length > 0 ? knobs : null;
}
