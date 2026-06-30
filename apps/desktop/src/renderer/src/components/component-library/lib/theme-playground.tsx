import { Button, RangeField } from "@pond/ui";
import { type CSSProperties, useState } from "react";
import styles from "./theme-playground.module.css";

// Accent picker offers every hue ramp; the value is the `data-accent` token.
const ACCENT_OPTIONS = [
  "ruby",
  "red",
  "orange",
  "gold",
  "yellow",
  "lime",
  "green",
  "jade",
  "teal",
  "cyan",
  "blue",
  "navy",
  "indigo",
  "violet",
  "purple",
  "magenta",
  "pink",
];

// Neutral picker: "pure" (untinted) plus a curated set of tinted grays.
const NEUTRAL_OPTIONS = [
  "pure",
  "gold",
  "green",
  "teal",
  "blue",
  "violet",
  "magenta",
];

// Fixed semantic hues — these stay constant as the primary/neutral change.
const STATUSES = [
  { key: "neutral", label: "Neutral", hue: "gray" },
  { key: "info", label: "Info", hue: "blue" },
  { key: "success", label: "Success", hue: "green" },
  { key: "warning", label: "Warning", hue: "gold" },
  { key: "error", label: "Error", hue: "red" },
];

const ROWS = [
  { label: "Neutral", hue: "gray" },
  { label: "Secondary", hue: "gray" },
  { label: "Info", hue: "blue" },
  { label: "Success", hue: "green" },
  { label: "Warning", hue: "gold" },
  { label: "Error", hue: "red" },
];

const DEFAULT_ACCENT = "blue";
const DEFAULT_NEUTRAL = "pure";
const DEFAULT_RADIUS = 8;

// Map a single base radius onto the whole --ds-radius-* scale so the preview
// rescales coherently from one control.
function radiusVars(r: number): CSSProperties {
  return {
    "--ds-radius-xs": `${Math.round(r * 0.5)}px`,
    "--ds-radius-sm": `${Math.round(r * 0.75)}px`,
    "--ds-radius-md": `${r}px`,
    "--ds-radius-lg": `${Math.round(r * 1.3)}px`,
    "--ds-radius-xl": `${Math.round(r * 1.6)}px`,
    "--ds-radius-2xl": `${Math.round(r * 2)}px`,
  } as CSSProperties;
}

function hueVar(hue: string, step: number): string {
  return `var(--ds-${hue}-${step})`;
}

export function ThemePlayground() {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [neutral, setNeutral] = useState(DEFAULT_NEUTRAL);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);

  const reset = () => {
    setAccent(DEFAULT_ACCENT);
    setNeutral(DEFAULT_NEUTRAL);
    setRadius(DEFAULT_RADIUS);
  };

  return (
    <div className={styles.playground}>
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Settings</h3>

        <div className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.groupLabel}>Primary color</span>
            <span className={styles.groupValue}>{accent}</span>
          </div>
          <div className={styles.swatches}>
            {ACCENT_OPTIONS.map((hue) => (
              <button
                key={hue}
                type="button"
                aria-label={hue}
                aria-pressed={hue === accent}
                className={styles.swatch}
                data-selected={hue === accent || undefined}
                style={{ background: hueVar(hue, 9) }}
                onClick={() => setAccent(hue)}
              />
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.groupLabel}>Neutral color</span>
            <span className={styles.groupValue}>{neutral}</span>
          </div>
          <div className={styles.swatches}>
            {NEUTRAL_OPTIONS.map((value) => (
              <span
                key={value}
                data-neutral={value === "pure" ? undefined : value}
                style={{ display: "contents" }}
              >
                <button
                  type="button"
                  aria-label={value}
                  aria-pressed={value === neutral}
                  className={styles.swatch}
                  data-selected={value === neutral || undefined}
                  style={{ background: "var(--ds-gray-9)" }}
                  onClick={() => setNeutral(value)}
                />
              </span>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.groupLabel}>Radius</span>
            <span className={styles.groupValue}>{radius}px</span>
          </div>
          <RangeField
            value={radius}
            min={0}
            max={20}
            suffix="px"
            aria-label="Radius"
            onValueChange={setRadius}
          />
        </div>

        <Button variant="secondary" size="sm" onClick={reset}>
          Reset to default
        </Button>
      </section>

      <section
        className={styles.preview}
        data-accent={accent}
        data-neutral={neutral === "pure" ? undefined : neutral}
        style={radiusVars(radius)}
      >
        <h3 className={styles.panelTitle}>Preview</h3>

        <div className={styles.btnRow}>
          <Button variant="primary" size="sm">
            Send
          </Button>
          <Button variant="secondary" size="sm">
            Settings
          </Button>
          <Button variant="ghost" size="sm">
            Like
          </Button>
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        </div>

        <div className={styles.pillBlock}>
          <div className={styles.pillRow}>
            {STATUSES.map((s) => (
              <span
                key={s.key}
                className={styles.pillSolid}
                style={{
                  background: hueVar(s.hue, 9),
                  color: hueVar(s.hue, 1),
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
          <div className={styles.pillRow}>
            {STATUSES.map((s) => (
              <span
                key={s.key}
                className={styles.pillSoft}
                style={{
                  background: hueVar(s.hue, 3),
                  color: hueVar(s.hue, 11),
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
          <div className={styles.pillRow}>
            {STATUSES.map((s) => (
              <span key={s.key} className={styles.pillDot}>
                <span
                  className={styles.dot}
                  style={{ background: hueVar(s.hue, 9) }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.list}>
          {ROWS.map((row) => (
            <div
              key={row.label}
              className={styles.listRow}
              style={{
                background: hueVar(row.hue, 2),
                color: hueVar(row.hue, 11),
                boxShadow: `inset 0 0 0 1px ${hueVar(row.hue, 4)}`,
              }}
            >
              {row.label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
