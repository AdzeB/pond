import type { InsightConfig } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { InsightEditorDialog } from "@/components/library-analytics-insight-editor";
import { useSaves } from "@/hooks/use-saves";
import { insightEditor } from "@/stores/insight-editor";
import { InsightCard } from "./insight-card";
import { useDashboards } from "./lib/dashboards";
import { isSavesInsight, newInsight, savesInWindow } from "./lib/insights";
import styles from "./styles.module.css";

/** One dashboard's insight grid; the dashboard index page and the dock's analytics cards handle switching and management. */
export function AnalyticsPage({ id }: { id: string }) {
  const { loaded, dashboard, activeId, switchDashboard, setInsights } =
    useDashboards(id);

  /** The dock's range and edit cards act on `activeId`; keep it pointed at the routed dashboard. */
  useEffect(() => {
    if (loaded && activeId !== id) switchDashboard(id);
  }, [loaded, activeId, id, switchDashboard]);

  /** Cards on non-saves datasets can't be computed; hide them, and the next dashboard edit persists the pruned list. */
  const insights = useMemo(
    () => dashboard.insights.filter(isSavesInsight),
    [dashboard.insights],
  );

  /** The saves pool is already fully in memory; every card derives from it. */
  const saves = useSaves();
  const dashboardSaves = useMemo(
    () => savesInWindow(saves, dashboard.days),
    [saves, dashboard.days],
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const dragFrom = useRef<number>(-1);

  const patchInsight = (id: string, patch: Partial<InsightConfig>) => {
    setInsights(insights.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const saveInsight = (config: InsightConfig) => {
    const exists = insights.some((c) => c.id === config.id);
    setInsights(
      exists
        ? insights.map((c) => (c.id === config.id ? config : c))
        : [...insights, config],
    );
  };

  /** Keep the latest closure without re-registering the save handler every render. */
  const saveRef = useRef(saveInsight);
  saveRef.current = saveInsight;
  useEffect(
    () =>
      insightEditor.registerSaveHandler((config) => saveRef.current(config)),
    [],
  );

  /** The editor's filter menus and live preview work from the dashboard's windowed saves. */
  useEffect(() => {
    insightEditor.setData(dashboardSaves, dashboard.days);
  }, [dashboardSaves, dashboard.days]);

  /** The editor previews this dashboard's data; close it when leaving. */
  useEffect(() => () => insightEditor.cancel(), []);

  const duplicateInsight = (id: string) => {
    const index = insights.findIndex((c) => c.id === id);
    const original = insights[index];
    if (!original) return;
    const copy = { ...original, id: crypto.randomUUID() };
    const next = [...insights];
    next.splice(index + 1, 0, copy);
    setInsights(next);
  };

  const removeInsight = (id: string) => {
    setInsights(insights.filter((c) => c.id !== id));
  };

  const handleDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    if (dragFrom.current < 0 || dragFrom.current === overIndex) return;
    const next = [...insights];
    const [moved] = next.splice(dragFrom.current, 1);
    if (!moved) return;
    next.splice(overIndex, 0, moved);
    dragFrom.current = overIndex;
    setInsights(next);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.name}>{dashboard.name}</h1>
            {dashboard.description ? (
              <p className={styles.description}>{dashboard.description}</p>
            ) : null}
          </div>
        </header>

        {loaded && insights.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles["empty-title"]}>No insights yet</p>
            <p className={styles["empty-sub"]}>
              Add an insight to start charting your library.
            </p>
            <Button
              variant="secondary"
              onClick={() => insightEditor.open(newInsight(), true)}
            >
              Add insight
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {insights.map((config, index) => (
              <InsightCard
                key={config.id}
                config={config}
                saves={dashboardSaves}
                days={dashboard.days}
                onChange={(patch) => patchInsight(config.id, patch)}
                onEdit={() => insightEditor.open(config, false)}
                onDuplicate={() => duplicateInsight(config.id)}
                onRemove={() => removeInsight(config.id)}
                dragging={dragId === config.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDragId(config.id);
                  dragFrom.current = index;
                }}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={() => {
                  setDragId(null);
                  dragFrom.current = -1;
                }}
              />
            ))}
          </div>
        )}
      </div>

      <InsightEditorDialog />
    </div>
  );
}
