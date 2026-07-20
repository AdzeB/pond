import { Button } from "@pond/ui";
import { useState } from "react";
import { formatNumber } from "@/lib/util/format";
import type { MockSave, MockSaves } from "./lib/mock";
import { groupRows, MockThumb, savedMeta } from "./lib/shared";
import styles from "./variant-tray.module.css";

/** Prototype H: floating tray. No page at all; progress lives in a Proton-style panel pinned over the library. */

type Filter = "all" | "active" | "done" | "failed";

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
  { id: "failed", label: "Failed" },
];

function Row({ save, saves }: { save: MockSave; saves: MockSaves }) {
  return (
    <div className={styles.row}>
      <MockThumb save={save} size={26} />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{save.title}</span>
        <span
          className={styles.rowSub}
          data-tone={save.status === "failed" ? "error" : undefined}
        >
          {save.status === "saving"
            ? `${save.stage} · ${Math.round(save.progress * 100)}%`
            : save.status === "failed"
              ? save.error
              : savedMeta(save)}
        </span>
        {save.status === "saving" ? (
          <span className={styles.rowTrack} aria-hidden>
            <span
              className={styles.rowFill}
              style={{ transform: `scaleX(${save.progress})` }}
            />
          </span>
        ) : null}
      </span>
      {save.status === "failed" ? (
        <Button
          variant="secondary"
          size="xs"
          onClick={() => saves.retry(save.id)}
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function VariantTray({ saves }: { saves: MockSaves }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState(false);
  const { failed, saving, saved } = groupRows(saves.rows);

  const counts: Record<Filter, number> = {
    all: saves.rows.length,
    active: saving.length,
    done: saved.length,
    failed: failed.length,
  };

  const visible =
    filter === "active"
      ? saving
      : filter === "done"
        ? saved
        : filter === "failed"
          ? failed
          : [...saving, ...failed, ...saved];

  const overall =
    saving.length > 0
      ? saving.reduce((sum, s) => sum + s.progress, 0) / saving.length
      : 1;

  const headline =
    saving.length > 0
      ? `${formatNumber(saving.length)} saving (${Math.round(overall * 100)}%)`
      : failed.length > 0
        ? `${formatNumber(failed.length)} failed`
        : "All saved";

  return (
    <div className={styles.root}>
      {/* Muted stand-in for the library grid, so the tray reads as an overlay, not a page. */}
      <div className={styles.backdrop} aria-hidden>
        {Array.from({ length: 15 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative static tiles
          <span key={i} className={styles.ghost} />
        ))}
      </div>

      <div className={styles.tray}>
        <button
          type="button"
          className={styles.trayHead}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className={styles.trayTitle}>{headline}</span>
          <span className={styles.chev} data-open={!collapsed || undefined}>
            ›
          </span>
        </button>

        {!collapsed ? (
          <>
            <div className={styles.tabs}>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={styles.tab}
                  data-active={filter === f.id || undefined}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  {counts[f.id] > 0 ? (
                    <span className={styles.tabCount}>
                      {formatNumber(counts[f.id])}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className={styles.list}>
              {visible.length === 0 ? (
                <p className={styles.empty}>Nothing here.</p>
              ) : (
                visible.map((save) => (
                  <Row key={save.id} save={save} saves={saves} />
                ))
              )}
            </div>

            <footer className={styles.trayFoot}>
              {saving.length > 0 ? (
                <button
                  type="button"
                  className={styles.footButton}
                  onClick={saves.stopAll}
                >
                  Stop all
                </button>
              ) : null}
              {failed.length > 0 ? (
                <button
                  type="button"
                  className={styles.footButton}
                  onClick={saves.retryAll}
                >
                  Retry failed
                </button>
              ) : null}
              {saved.length > 0 ? (
                <button
                  type="button"
                  className={styles.footButton}
                  onClick={saves.clearFinished}
                >
                  Clear
                </button>
              ) : null}
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}
