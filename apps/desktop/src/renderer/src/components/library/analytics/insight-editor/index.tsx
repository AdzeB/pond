import { IconXmarkOutline12 as Xmark } from "@pond/icons/outline/12";
import {
  IconChartAreaOutline18 as AreaIcon,
  IconChartColumnOutline18 as ChartIcon,
  IconChartDonut2Outline18 as DonutIcon,
  IconHashtagOutline18 as HashIcon,
  IconCalendarGridOutline18 as HeatmapIcon,
  IconChartLineOutline18 as LineIcon,
  IconChartPieOutline18 as PieIcon,
  IconChartRadarOutline18 as RadarIcon,
  IconTableOutline18 as TableIcon,
} from "@pond/icons/outline/18";
import type {
  InsightConfig,
  InsightDisplay,
  InsightSegment,
  InsightSlice,
  InsightVizOptions,
} from "@pond/schema/db";
import { Accordion, Button, Dialog, Switch } from "@pond/ui";
import { useMemo, useRef } from "react";
import { FilterBar } from "@/components/library/analytics/filter-bar";
import { InsightBody } from "@/components/library/analytics/insight-body";
import {
  applyFilters,
  autoTitle,
  computeInsight,
  DISPLAY_OPTIONS,
  defaultSize,
  GRID_CELL_W,
  GRID_GAP,
  GRID_ROW_H,
  insightTitle,
  SEGMENT_OPTIONS,
  SLICE_OPTIONS,
  sizeOf,
} from "@/components/library/analytics/lib/insights";
import {
  layersFor,
  layerVisible,
} from "@/components/library/analytics/lib/layers";
import { EnumSelect } from "@/components/shared/enum-select";
import { insightEditor, useInsightEditorState } from "@/stores/insight-editor";
import { Section } from "./form-controls";
import { layerHasKnobs, layerKnobs } from "./layer-knobs";
import { SizePicker } from "./size-picker";
import styles from "./styles.module.css";

/** Full-page insight editor; the draft lives in the insight-editor store and the analytics page persists it on save. */

const NONE = "__none__";
type SegmentValue = InsightSegment | typeof NONE;

const DISPLAY_ICONS: Record<
  InsightDisplay,
  React.ComponentType<{ width?: number; height?: number }>
> = {
  chart: ChartIcon,
  area: AreaIcon,
  line: LineIcon,
  ring: DonutIcon,
  pie: PieIcon,
  sunburst: DonutIcon,
  radar: RadarIcon,
  heatmap: HeatmapIcon,
  metric: HashIcon,
  table: TableIcon,
};

/** Displays that don't chart per-slice groups; slice/segment don't apply. */
const NO_SLICE_DISPLAYS = new Set<InsightDisplay>(["heatmap", "metric"]);

/** Single-hue shapes color by slice, so a segment would be invisible. */
const NO_SEGMENT_DISPLAYS = new Set<InsightDisplay>([
  ...NO_SLICE_DISPLAYS,
  "ring",
  "pie",
  "radar",
]);

const displayOptions = DISPLAY_OPTIONS.map(({ value, label }) => {
  const Icon = DISPLAY_ICONS[value];
  return {
    value,
    label: (
      <span className={styles["display-option"]}>
        <Icon />
        {label}
      </span>
    ),
  };
});

export function InsightEditorDialog() {
  const { draft, isNew, saves, days } = useInsightEditorState();

  /** Keep rendering the last draft during the exit transition; save/cancel clear the store before the popup finishes animating out. */
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

  /** The closed root must still mount: Base UI only plays enter transitions when `open` flips while the root is mounted. */
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

  /** Every hideable layer gets a section; locked layers only appear when they have style knobs to offer. */
  const sectionLayers = layersFor(config.display).filter(
    (l) => !l.locked || layerHasKnobs(config.display, l.id),
  );

  const patchViz = (patch: Partial<InsightVizOptions>) =>
    insightEditor.patch({ viz: { ...config.viz, ...patch } });

  const toggleLayer = (id: string) => {
    /** Area/line points live in `viz.points`, not the hidden-layers list. */
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
      /** `fill: "none"` also hides the fill; restore a real fill on unhide. */
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
                render={
                  <Button
                    icon
                    size="xs"
                    variant="ghost"
                    className={styles["header-button"]}
                    aria-label="Cancel"
                  />
                }
              >
                <Xmark />
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
                          /** New drafts pick up the display's natural grid size; placed cards keep whatever the user set. */
                          ...(isNew ? defaultSize(display) : {}),
                          /** A sunburst is defined by its second level; give it one if the draft lacks a usable segment. */
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
                            /** A segment equal to the new slice is meaningless. */
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
                width: size.w * GRID_CELL_W + (size.w - 1) * GRID_GAP,
                height: size.h * GRID_ROW_H + (size.h - 1) * GRID_GAP,
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
