import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type MockTile, useMockTiles } from "./lib/mock";
import {
  RedesignAppIcon,
  RedesignBanner,
  RedesignCard,
  RedesignChip,
  RedesignEditorial,
  RedesignPoster,
  RedesignRow,
  RedesignSplit,
  RedesignStat,
  RedesignTable,
} from "./redesigns";
import styles from "./styles.module.css";
import { VariantBadge } from "./variant-badge";
import { VariantCurrent } from "./variant-current";
import { VariantDot } from "./variant-dot";
import { VariantHairline } from "./variant-hairline";
import { VariantRing } from "./variant-ring";
import { VariantStatusLine } from "./variant-status-line";
import { VariantVeil } from "./variant-veil";
import { VariantWipe } from "./variant-wipe";

/** Dev-only specimen sheet for the sources-page tile; every sync state at once, across candidate treatments. */

type VariantId =
  | "current"
  | "badge"
  | "ring"
  | "status-line"
  | "veil"
  | "dot"
  | "hairline"
  | "wipe"
  | "r-row"
  | "r-card"
  | "r-poster"
  | "r-editorial"
  | "r-appicon"
  | "r-split"
  | "r-stat"
  | "r-chip"
  | "r-table"
  | "r-banner";

interface Variant {
  label: string;
  blurb: string;
  component: React.ComponentType<{ tile: MockTile }>;
  /** Stage grid columns; 3 matches the shipping sources grid. */
  columns?: number;
  /** Tightens the stage grid gap for row-like layouts. */
  dense?: boolean;
}

const STATE_IDS: readonly VariantId[] = [
  "current",
  "badge",
  "ring",
  "status-line",
  "veil",
  "dot",
  "hairline",
  "wipe",
];

const REDESIGN_IDS: readonly VariantId[] = [
  "r-row",
  "r-card",
  "r-poster",
  "r-editorial",
  "r-appicon",
  "r-split",
  "r-stat",
  "r-chip",
  "r-table",
  "r-banner",
];

const VARIANTS: Record<VariantId, Variant> = {
  current: {
    label: "A · Current",
    blurb:
      "What ships today, rendered by the real component. Status hijacks the count line, and broken states are amber text only.",
    component: VariantCurrent,
  },
  badge: {
    label: "B · Status badge",
    blurb:
      "The brand chip in the corner swaps to a state glyph: spinner, check, key, warning. Glanceable across a full grid without reading.",
    component: VariantBadge,
  },
  ring: {
    label: "C · Progress ring",
    blurb:
      "The avatar ring carries state. Determinate progress when the total is known, a toned ring when the source is broken.",
    component: VariantRing,
  },
  "status-line": {
    label: "D · Status line",
    blurb:
      "Three lines. Name and identity never move; the last line trades between the item count and the state.",
    component: VariantStatusLine,
  },
  veil: {
    label: "E · Install veil",
    blurb:
      "App Store install treatment. The artwork dims and carries its own progress; broken states tint the veil. Nothing outside the avatar moves.",
    component: VariantVeil,
  },
  dot: {
    label: "F · Status dot",
    blurb:
      "Attio-style. A tiny dot before the sub line is the only signal: pulsing while syncing, toned when broken. Text stays neutral.",
    component: VariantDot,
  },
  hairline: {
    label: "G · Hairline",
    blurb:
      "Downloads-manager shape. A 3px bar under the avatar fills with progress; broken states leave a toned mark behind.",
    component: VariantHairline,
  },
  wipe: {
    label: "H · Color wipe",
    blurb:
      "Broken sources drain to grayscale; syncing pours the color back in from the bottom as progress. The avatar is the status.",
    component: VariantWipe,
  },
  "r-row": {
    label: "R1 · List row",
    blurb:
      "Settings-style rows. Name and status on the left, count on the right. Dense, scannable, room for long status text.",
    component: RedesignRow,
    columns: 1,
    dense: true,
  },
  "r-card": {
    label: "R2 · Profile card",
    blurb:
      "Twitter-profile shape: a blurred artwork band with the avatar overlapping it, then name, status, and count.",
    component: RedesignCard,
    columns: 2,
  },
  "r-poster": {
    label: "R3 · Poster",
    blurb:
      "The artwork is the whole tile; text sits on a bottom scrim. Logo-only sources get a quiet branded slab.",
    component: RedesignPoster,
    columns: 3,
  },
  "r-editorial": {
    label: "R4 · Editorial",
    blurb:
      "Everything flush left: squircle artwork above left-aligned text. Calmer rhythm than the centered tile.",
    component: RedesignEditorial,
    columns: 3,
  },
  "r-appicon": {
    label: "R5 · Launcher",
    blurb:
      "Home-screen grammar: one big squircle icon, short label, tiny status. Closest to what ships, but square and bigger.",
    component: RedesignAppIcon,
    columns: 3,
  },
  "r-split": {
    label: "R6 · Split card",
    blurb:
      "Bordered card, artwork left, three text lines right. The border gives each source its own object.",
    component: RedesignSplit,
    columns: 2,
  },
  "r-stat": {
    label: "R7 · Stat card",
    blurb:
      "The item count leads at display size; the source identifies itself underneath. Sources as a dashboard.",
    component: RedesignStat,
    columns: 2,
  },
  "r-chip": {
    label: "R8 · Chip",
    blurb:
      "Sources as compact pills, like tags. Cheap to scan, wraps to any width, status is a dot plus a word.",
    component: RedesignChip,
    columns: 2,
    dense: true,
  },
  "r-table": {
    label: "R9 · Table",
    blurb:
      "One hairline row per source with status in its own column. The densest option; reads like a job list.",
    component: RedesignTable,
    columns: 1,
    dense: true,
  },
  "r-banner": {
    label: "R10 · Banner",
    blurb:
      "Wide bars with the artwork blurred into the left edge. One source per line with real presence.",
    component: RedesignBanner,
    columns: 1,
    dense: true,
  },
};

export function SourceTilePlayground() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<VariantId>("current");
  const [animate, setAnimate] = useState(true);
  const groups = useMockTiles(animate);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void navigate({ to: "/" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const active = VARIANTS[variant];
  const Active = active.component;

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Source tile states</h1>
          <p className={styles.subtitle}>
            Every sync state the sources grid can show, side by side. Data is
            mocked; the syncing tile ticks live.
          </p>
          <button
            type="button"
            aria-label="Exit playground"
            title="Exit playground (Esc)"
            className={styles.exit}
            onClick={() => void navigate({ to: "/" })}
          >
            <IconXmarkOutline12 strokeWidth={2} />
          </button>
        </header>

        <div className={styles.groups}>
          <div className={styles.group}>
            <div className={styles.groupLabel}>States</div>
            {STATE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.item}
                data-active={id === variant || undefined}
                onClick={() => setVariant(id)}
              >
                {VARIANTS[id].label}
              </button>
            ))}
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Redesigns</div>
            {REDESIGN_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.item}
                data-active={id === variant || undefined}
                onClick={() => setVariant(id)}
              >
                {VARIANTS[id].label}
              </button>
            ))}
            <p className={styles.hint}>{active.blurb}</p>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Options</div>
            <button
              type="button"
              className={styles.item}
              data-active={animate || undefined}
              onClick={() => setAnimate((v) => !v)}
            >
              Tick sync progress
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.stage}>
        <div className={styles.sheet}>
          {groups.map((group) => (
            <section key={group.label} className={styles.section}>
              <h2 className={styles.sectionTitle}>{group.label}</h2>
              <div
                className={styles.grid}
                data-dense={active.dense || undefined}
                style={{
                  gridTemplateColumns: `repeat(${active.columns ?? 3}, 1fr)`,
                }}
              >
                {group.tiles.map((tile) => (
                  <figure key={tile.id} className={styles.specimen}>
                    <Active tile={tile} />
                    <figcaption className={styles.caption}>
                      {tile.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
