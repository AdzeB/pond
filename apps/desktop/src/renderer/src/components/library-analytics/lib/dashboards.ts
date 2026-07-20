import {
  type DashboardConfig,
  DEFAULT_DASHBOARDS,
  type InsightConfig,
} from "@pond/schema/db";
import { usePrefs } from "@/stores/prefs";

/** Dashboard state lives in prefs so the dock's analytics cards drive the same dashboards the page renders. */

export const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 0, label: "All time" },
] as const;

export function newDashboard(): DashboardConfig {
  return {
    id: crypto.randomUUID(),
    name: "New dashboard",
    description: "",
    days: 7,
    filters: [],
    insights: [],
  };
}

/** `id` pins the hook to a route-param dashboard; without it the last-open one (prefs `activeId`) is used. */
export function useDashboards(id?: string) {
  const [view, patchView, loaded] = usePrefs("analyticsView");
  const dashboards = view.dashboards ?? [];
  const fallback = (dashboards[0] ?? DEFAULT_DASHBOARDS[0]) as DashboardConfig;
  const dashboard =
    dashboards.find((d) => d.id === (id ?? view.activeId)) ?? fallback;

  const patchDashboard = (patch: Partial<DashboardConfig>) => {
    const exists = dashboards.some((d) => d.id === dashboard.id);
    const next = exists
      ? dashboards.map((d) => (d.id === dashboard.id ? { ...d, ...patch } : d))
      : [...dashboards, { ...dashboard, ...patch }];
    patchView({ dashboards: next, activeId: dashboard.id });
  };

  const setInsights = (next: InsightConfig[]) =>
    patchDashboard({ insights: next });

  const switchDashboard = (activeId: string) => patchView({ activeId });

  const addDashboard = (): string => {
    const created = newDashboard();
    patchView({ dashboards: [...dashboards, created], activeId: created.id });
    return created.id;
  };

  const duplicateDashboard = (name?: string): string => {
    const copy: DashboardConfig = {
      ...dashboard,
      id: crypto.randomUUID(),
      name: name?.trim() || `${dashboard.name} copy`,
      insights: dashboard.insights.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
      })),
    };
    patchView({ dashboards: [...dashboards, copy], activeId: copy.id });
    return copy.id;
  };

  const deleteDashboard = () => {
    const rest = dashboards.filter((d) => d.id !== dashboard.id);
    patchView({ dashboards: rest, activeId: rest[0]?.id ?? "" });
  };

  return {
    loaded,
    dashboards,
    activeId: view.activeId,
    dashboard,
    patchDashboard,
    setInsights,
    switchDashboard,
    addDashboard,
    duplicateDashboard,
    deleteDashboard,
  };
}
