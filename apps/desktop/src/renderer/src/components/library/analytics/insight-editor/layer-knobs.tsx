import type { InsightDisplay, InsightVizOptions } from "@pond/schema/db";
import type { ReactNode } from "react";
import { EnumSelect } from "@/components/shared/enum-select";
import { KnobSlider, Seg } from "./form-controls";
import styles from "./layer-knobs.module.css";

/** Layers that expose style knobs for a given display; keep in sync with `layerKnobs`. */
export const KNOB_LAYER_IDS: Partial<
  Record<InsightDisplay, readonly string[]>
> = {
  area: ["line", "fill"],
  line: ["line"],
  chart: ["bars"],
  ring: ["wheel"],
  sunburst: ["wheel"],
  radar: ["polygon", "grid"],
};

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

export function layerHasKnobs(
  display: InsightDisplay,
  layerId: string,
): boolean {
  return KNOB_LAYER_IDS[display]?.includes(layerId) ?? false;
}

/** Style knobs for a (display, layer) pair; null when the layer has none. */
export function layerKnobs(
  display: InsightDisplay,
  layerId: string,
  viz: InsightVizOptions | undefined,
  patchViz: (patch: Partial<InsightVizOptions>) => void,
): ReactNode {
  const knobs: ReactNode[] = [];

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
