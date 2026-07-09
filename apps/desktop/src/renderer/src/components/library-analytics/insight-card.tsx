import {
  IconChevronRightOutline18 as Chevron,
  IconDotsOutline18 as Dots,
  IconGripDotsVerticalOutline18 as Grip,
} from "@pond/icons/outline/18";
import type { InsightConfig } from "@pond/schema/db";
import { Menu } from "@pond/ui";
import { useMemo } from "react";
import type { Save } from "@/lib/types";
import { InsightBody } from "./insight-body";
import {
  applyFilters,
  computeInsight,
  GRID_COLS,
  GRID_MAX_ROWS,
  insightTitle,
  sizeOf,
} from "./lib/insights";
import styles from "./styles.module.css";

const COL_SPANS = Array.from({ length: GRID_COLS }, (_, i) => i + 1);
const ROW_SPANS = Array.from({ length: GRID_MAX_ROWS }, (_, i) => i + 1);

interface InsightCardProps {
  config: InsightConfig;
  /** Dashboard-filtered, windowed saves; the card stacks its own filters on top. */
  saves: Save[];
  days: number;
  onChange: (patch: Partial<InsightConfig>) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** HTML5 drag-reorder, wired by the parent grid. */
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function InsightCard({
  config,
  saves,
  days,
  onChange,
  onEdit,
  onDuplicate,
  onRemove,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: InsightCardProps) {
  const data = useMemo(
    () => computeInsight(config, applyFilters(saves, config.filters), days),
    [config, saves, days],
  );
  const empty = data.saveCount === 0;
  const size = sizeOf(config);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag handlers are a pointer-only reorder affordance; all actions have real buttons.
    <section
      className={styles.card}
      data-w={size.w}
      data-h={size.h}
      data-dragging={dragging || undefined}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={styles["card-header"]}>
        <span className={styles["card-grip"]} aria-hidden>
          <Grip width={12} height={12} />
        </span>
        <button type="button" className={styles["card-title"]} onClick={onEdit}>
          <span className={styles["card-title-text"]}>
            {insightTitle(config)}
          </span>
          <Chevron width={11} height={11} className={styles["card-chevron"]} />
        </button>
        <div className={styles["card-actions"]}>
          <Menu.Root>
            <Menu.Trigger icon variant="ghost" aria-label="Insight actions">
              <Dots width={14} height={14} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end">
                <Menu.Popup>
                  <Menu.Items
                    items={[
                      { label: "Edit", onClick: onEdit },
                      { label: "Duplicate", onClick: onDuplicate },
                      {
                        type: "submenu",
                        label: "Width",
                        items: COL_SPANS.map((w) => ({
                          label: `${w} column${w === 1 ? "" : "s"}`,
                          disabled: size.w === w,
                          onClick: () => onChange({ w, h: size.h }),
                        })),
                      },
                      {
                        type: "submenu",
                        label: "Height",
                        items: ROW_SPANS.map((h) => ({
                          label: `${h} row${h === 1 ? "" : "s"}`,
                          disabled: size.h === h,
                          onClick: () => onChange({ w: size.w, h }),
                        })),
                      },
                      { type: "separator" },
                      { label: "Remove", onClick: onRemove },
                    ]}
                  />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>

      {empty ? (
        <div className={styles["card-empty"]}>
          No saves match this window yet.
        </div>
      ) : (
        <div className={styles["card-body"]}>
          <InsightBody config={config} data={data} days={days} />
        </div>
      )}
    </section>
  );
}
