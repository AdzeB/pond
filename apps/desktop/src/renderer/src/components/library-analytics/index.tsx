import {
  IconDotsOutline18 as Dots,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import {
  type DashboardConfig,
  DEFAULT_DASHBOARDS,
  type InsightConfig,
} from "@pond/schema/db";
import { Button, Menu, Tooltip } from "@pond/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { EnumSelect } from "@/components/enum-select";
import { InsightEditorDialog } from "@/components/library-analytics-insight-editor";
import { useSaves } from "@/hooks/use-saves";
import { insightEditor } from "@/stores/insight-editor";
import { usePrefs } from "@/stores/prefs";
import { FilterBar } from "./filter-bar";
import { InsightCard } from "./insight-card";
import {
  applyFilters,
  isSavesInsight,
  newInsight,
  savesInWindow,
} from "./lib/insights";
import styles from "./styles.module.css";

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 0, label: "All time" },
];

function newDashboard(): DashboardConfig {
  return {
    id: crypto.randomUUID(),
    name: "New dashboard",
    description: "",
    days: 7,
    filters: [],
    insights: [],
  };
}

// Analytics dashboards: named, filterable collections of insight cards
// over the same window of library saves. Everything persists in prefs.
export function AnalyticsPage() {
  const [view, patchView, loaded] = usePrefs("analyticsView");
  const dashboards = view.dashboards ?? [];
  const fallback = (dashboards[0] ?? DEFAULT_DASHBOARDS[0]) as DashboardConfig;
  const dashboard = dashboards.find((d) => d.id === view.activeId) ?? fallback;
  // Cards saved before insights went saves-only (the retired sync-runs
  // dataset) can't be computed anymore; hide them, and the next edit to the
  // dashboard persists the pruned list.
  const insights = useMemo(
    () => dashboard.insights.filter(isSavesInsight),
    [dashboard.insights],
  );

  // The saves pool is already fully in memory; every card derives from it.
  const saves = useSaves();
  const dashboardSaves = useMemo(
    () => applyFilters(savesInWindow(saves, dashboard.days), dashboard.filters),
    [saves, dashboard.days, dashboard.filters],
  );

  const nameRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder: track the picked-up card and swap on hover.
  const [dragId, setDragId] = useState<string | null>(null);
  const dragFrom = useRef<number>(-1);

  const patchDashboard = (patch: Partial<DashboardConfig>) => {
    const exists = dashboards.some((d) => d.id === dashboard.id);
    const next = exists
      ? dashboards.map((d) => (d.id === dashboard.id ? { ...d, ...patch } : d))
      : [...dashboards, { ...dashboard, ...patch }];
    patchView({ dashboards: next, activeId: dashboard.id });
  };

  const setInsights = (next: InsightConfig[]) =>
    patchDashboard({ insights: next });

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

  // The dialog persists through this handler; keep the latest closure
  // without re-registering every render.
  const saveRef = useRef(saveInsight);
  saveRef.current = saveInsight;
  useEffect(
    () =>
      insightEditor.registerSaveHandler((config) => saveRef.current(config)),
    [],
  );

  // The editor's filter menus and live preview work from the dashboard's
  // filtered saves and window.
  useEffect(() => {
    insightEditor.setData(dashboardSaves, dashboard.days);
  }, [dashboardSaves, dashboard.days]);

  // The editor previews this dashboard's data; close it when leaving.
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

  const addDashboard = () => {
    const created = newDashboard();
    patchView({ dashboards: [...dashboards, created], activeId: created.id });
  };

  const duplicateDashboard = () => {
    const copy: DashboardConfig = {
      ...dashboard,
      id: crypto.randomUUID(),
      name: `${dashboard.name} copy`,
      insights: dashboard.insights.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
      })),
    };
    patchView({ dashboards: [...dashboards, copy], activeId: copy.id });
  };

  const deleteDashboard = () => {
    const rest = dashboards.filter((d) => d.id !== dashboard.id);
    const next = rest.length > 0 ? rest : [newDashboard()];
    patchView({ dashboards: next, activeId: next[0]?.id ?? "" });
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <input
              ref={nameRef}
              className={styles["name-input"]}
              value={dashboard.name}
              aria-label="Dashboard name"
              onChange={(e) => patchDashboard({ name: e.target.value })}
            />
            <input
              className={styles["description-input"]}
              value={dashboard.description}
              placeholder="Add a description…"
              aria-label="Dashboard description"
              onChange={(e) => patchDashboard({ description: e.target.value })}
            />
          </div>

          {dashboards.length > 1 ? (
            <EnumSelect<string>
              value={dashboard.id}
              options={dashboards.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              onValueChange={(activeId) => patchView({ activeId })}
              aria-label="Switch dashboard"
            />
          ) : null}

          <EnumSelect<number>
            value={dashboard.days}
            options={RANGE_OPTIONS}
            onValueChange={(days) => patchDashboard({ days })}
            aria-label="Time range"
          />

          <Menu.Root>
            <Menu.Trigger icon variant="ghost" aria-label="Dashboard actions">
              <Dots width={14} height={14} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end">
                <Menu.Popup>
                  <Menu.Items
                    items={[
                      { label: "New dashboard", onClick: addDashboard },
                      {
                        label: "Rename",
                        onClick: () => nameRef.current?.select(),
                      },
                      { label: "Duplicate", onClick: duplicateDashboard },
                      { type: "separator" },
                      {
                        label: "Delete dashboard",
                        disabled: dashboards.length <= 1,
                        onClick: deleteDashboard,
                      },
                    ]}
                  />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>

          <Tooltip label="Add insight">
            <Button
              icon
              variant="secondary"
              aria-label="Add insight"
              onClick={() => insightEditor.open(newInsight(), true)}
            >
              <Plus width={16} height={16} />
            </Button>
          </Tooltip>
        </header>

        <FilterBar
          filters={dashboard.filters}
          saves={saves}
          onChange={(filters) => patchDashboard({ filters })}
        />

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
