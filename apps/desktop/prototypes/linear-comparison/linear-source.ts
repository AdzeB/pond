import type { CSSProperties } from "react";
import appSamples from "./public/evidence/linear-app-styles.json";
import nativeData from "./public/evidence/linear-native-styles.json";

export type LinearSample = {
  id: string;
  source: string;
  metrics: Record<string, string | undefined>;
  computed: Record<string, string>;
  capturedAt: string;
  note?: string;
};

export const nativeSamples = nativeData.samples;
export const linearSamples: LinearSample[] = [
  ...new Map<string, LinearSample>([
    ...appSamples.map((sample) => [sample.id, sample] as const),
    ...nativeSamples.map(
      (sample) =>
        [
          sample.id,
          {
            id: sample.id,
            source: nativeData.source,
            capturedAt: nativeData.capturedAt,
            metrics: {
              ...sample.css,
              background: sample.css.backgroundColor,
            },
            computed: Object.fromEntries(
              Object.entries(sample.css).map(([key, value]) => [
                key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
                value,
              ]),
            ),
            note: nativeData.notes,
          },
        ] as const,
    ),
  ]).values(),
];

export function linearStyle(
  id: string,
  dimensions: "height" | "both" | "fluid" = "height",
): CSSProperties {
  const sample = linearSamples.find((item) => item.id === id);
  if (!sample) return {};
  const properties = Object.fromEntries(
    Object.entries(sample.metrics).filter(
      ([key]) =>
        ![
          "width",
          "height",
          "minWidth",
          "maxWidth",
          "minHeight",
          "maxHeight",
          "position",
          "top",
          "right",
          "bottom",
          "left",
          "transform",
          "display",
          "alignItems",
          "justifyContent",
          "flexDirection",
          "flexShrink",
          "gap",
          "margin",
          "overflow",
          "outline",
          "outlineOffset",
          "background",
          "backgroundColor",
          "padding",
        ].includes(key),
    ),
  );
  const result: CSSProperties & { "--linear-source-background"?: string } = {
    ...properties,
    "--linear-source-background": sample.metrics.background,
    backgroundColor:
      "var(--linear-state-background, var(--linear-source-background))",
    padding: sample.metrics.padding,
    boxSizing: "border-box",
  };
  if (dimensions !== "fluid") result.height = sample.metrics.height;
  if (dimensions === "both") result.width = sample.metrics.width;
  return result;
}
