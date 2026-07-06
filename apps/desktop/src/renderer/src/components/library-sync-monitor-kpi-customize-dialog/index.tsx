import { DEFAULT_SOURCE_METRICS } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import {
  METRIC_BY_ID,
  METRIC_CATALOG,
  METRIC_GROUPS,
  type MetricDisplay,
} from "@/components/library-sync-monitor/lib/kpi-catalog";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

const WINDOWS = [
  { value: 1, label: "24h" },
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
];

export function KpiCustomizeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open ? <Body /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body() {
  const [view, patch] = usePrefs("sourcesView");
  const ids = view.metrics ?? DEFAULT_SOURCE_METRICS;
  const days = view.days ?? 7;
  const displayOf = (id: string): MetricDisplay =>
    view.metricDisplay?.[id] ?? METRIC_BY_ID[id]?.defaultDisplay ?? "chip";

  const toggle = (id: string) => {
    patch({
      metrics: ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id],
    });
  };

  const setDisplay = (id: string, display: MetricDisplay) => {
    patch({ metricDisplay: { ...(view.metricDisplay ?? {}), [id]: display } });
  };

  const reset = () => {
    patch({ metrics: [...DEFAULT_SOURCE_METRICS], metricDisplay: {}, days: 7 });
  };

  return (
    <Dialog.Popup className={styles["dialog-popup"]}>
      <div className={styles["dialog-header"]}>
        <div className={styles["dialog-heading"]}>
          <Dialog.Title className={styles["dialog-title"]}>
            Customize metrics
          </Dialog.Title>
          <div className={styles["dialog-subtitle"]}>
            Choose what to track and whether each shows as a card or a chip.
          </div>
        </div>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          ✕
        </Dialog.Close>
      </div>

      <div className={styles["dialog-body"]}>
        <div className={styles.field}>
          <div>
            <div className={styles["field-label"]}>Window</div>
            <div className={styles["field-hint"]}>
              Rolling period the KPIs summarize.
            </div>
          </div>
          <span className={styles.segmented}>
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                className={days === w.value ? styles.on : undefined}
                onClick={() => patch({ days: w.value })}
              >
                {w.label}
              </button>
            ))}
          </span>
        </div>

        {METRIC_GROUPS.map((group) => {
          const metrics = METRIC_CATALOG.filter((m) => m.group === group);
          if (metrics.length === 0) return null;
          return (
            <div key={group}>
              <div className={styles["category-group"]}>{group}</div>
              {metrics.map((m) => {
                const on = ids.includes(m.id);
                const display = displayOf(m.id);
                return (
                  <div
                    key={m.id}
                    className={`${styles.metric} ${on ? "" : styles.off}`}
                  >
                    <div>
                      <div className={styles["metric-name"]}>{m.label}</div>
                      <div className={styles["metric-description"]}>
                        {m.description}
                      </div>
                    </div>
                    <span className={styles["display-segmented"]}>
                      {(["card", "chip"] as MetricDisplay[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={display === d ? styles.on : undefined}
                          onClick={() => setDisplay(m.id, d)}
                        >
                          {d === "card" ? "Card" : "Chip"}
                        </button>
                      ))}
                    </span>
                    <Button
                      variant={on ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => toggle(m.id)}
                    >
                      {on ? "On" : "Off"}
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className={styles["dialog-actions"]}>
        <Button variant="secondary" onClick={reset}>
          Reset to defaults
        </Button>
        <Dialog.Close render={<Button variant="primary">Done</Button>} />
      </div>
    </Dialog.Popup>
  );
}
