import {
  IconChartFill18 as Analytics,
  IconEyeFill18 as Display,
  IconGridFill18 as Layout,
  IconPlusFill18 as Plus,
  IconDescendingSortingFill18 as Sort,
  IconRefreshFill18 as Sync,
  IconSizeFill18 as Zoom,
} from "@pond/icons/fill/18";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Tooltip, Tray } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import styles from "./styles.module.css";

/** Dev-only specimen sheet for the shared tooltip; edit packages/ui/src/tooltip/styles.module.css and watch every case at once. */

const dockTip = Tooltip.createHandle<React.ReactNode>();

const DOCK_ROW = [
  { label: "Layout", icon: <Layout /> },
  { label: "Zoom", icon: <Zoom /> },
  { label: "Sort", icon: <Sort /> },
  { label: "Display", icon: <Display /> },
  { label: "Analytics", icon: <Analytics /> },
  { label: "Sync All", icon: <Sync /> },
  { label: "New Dashboard", icon: <Plus /> },
] as const;

const SIDES = ["top", "bottom", "left", "right"] as const;
const ALIGNS = ["start", "center", "end"] as const;
const OFFSETS = [4, 8, 16] as const;

const DELAYS = [
  { label: "Instant", delay: 0 },
  { label: "Default", delay: undefined },
  { label: "Slow (600ms)", delay: 600 },
] as const;

const CONTENTS = [
  { label: "Short", tip: "Rename" },
  { label: "Sentence", tip: "Retry every item that failed to save." },
  {
    label: "Wrapping",
    tip: "Embedding 240 items again in the background. This can take a while on large libraries, so leave the app running.",
  },
] as const;

function Cell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.cell}>
      <h2 className={styles["cell-title"]}>{title}</h2>
      <div className={styles["cell-body"]}>{children}</div>
    </section>
  );
}

export function TooltipPlayground() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void navigate({ to: "/" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tooltip playground</h1>
          <p className={styles.subtitle}>
            Hover anything. Styles live in packages/ui/src/tooltip.
          </p>
        </div>
        <button
          type="button"
          aria-label="Exit playground"
          className={styles.exit}
          onClick={() => void navigate({ to: "/" })}
        >
          <IconXmarkOutline12 />
        </button>
      </header>

      <Cell title="Dock row (glide between triggers)">
        <Tray.Pill className={styles.pill}>
          {DOCK_ROW.map(({ label, icon }) => (
            <Tooltip.Trigger
              key={label}
              handle={dockTip}
              payload={label}
              render={<Tray.Item aria-label={label}>{icon}</Tray.Item>}
            />
          ))}
        </Tray.Pill>
        <Tooltip.Shared handle={dockTip} side="top" />
      </Cell>

      <div className={styles.grid}>
        <Cell title="Sides">
          {SIDES.map((side) => (
            <Tooltip key={side} label={`side="${side}"`} side={side}>
              <button type="button" className={styles.chip}>
                {side}
              </button>
            </Tooltip>
          ))}
        </Cell>

        <Cell title="Align (side top)">
          {ALIGNS.map((align) => (
            <Tooltip
              key={align}
              label={`align="${align}"`}
              side="top"
              align={align}
            >
              <button type="button" className={styles.chip}>
                {align}
              </button>
            </Tooltip>
          ))}
        </Cell>

        <Cell title="Side offset">
          {OFFSETS.map((offset) => (
            <Tooltip
              key={offset}
              label={`sideOffset={${offset}}`}
              side="top"
              sideOffset={offset}
            >
              <button type="button" className={styles.chip}>
                {offset}px
              </button>
            </Tooltip>
          ))}
        </Cell>

        <Cell title="Delay">
          {DELAYS.map(({ label, delay }) => (
            <Tooltip key={label} label={label} side="top" delay={delay}>
              <button type="button" className={styles.chip}>
                {label}
              </button>
            </Tooltip>
          ))}
        </Cell>

        <Cell title="Content length">
          {CONTENTS.map(({ label, tip }) => (
            <Tooltip key={label} label={tip} side="top">
              <button type="button" className={styles.chip}>
                {label}
              </button>
            </Tooltip>
          ))}
        </Cell>

        <Cell title="Near viewport edge (collision)">
          <div className={styles.corners}>
            <Tooltip label="Pushed off the left edge" side="top">
              <button type="button" className={styles.chip}>
                left
              </button>
            </Tooltip>
            <Tooltip label="Pushed off the right edge" side="top">
              <button type="button" className={styles.chip}>
                right
              </button>
            </Tooltip>
          </div>
        </Cell>
      </div>
    </div>
  );
}
