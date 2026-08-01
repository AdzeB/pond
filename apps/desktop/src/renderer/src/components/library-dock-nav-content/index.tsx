import {
  IconSparkle3Fill18 as Ask,
  IconCalendarFill18 as Calendar,
  IconCopyFill18 as Copy,
  IconEyeFill18 as DisplayIcon,
  IconGridFill18 as LayoutIcon,
  IconPencilFill18 as Pencil,
  IconPlusFill18 as Plus,
  IconDescendingSortingFill18 as SortIcon,
  IconRefreshFill18 as Sync,
  IconTrash2ContentFill18 as Trash,
  IconSizeFill18 as ZoomIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip, Tray } from "@pond/ui";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useDashboards } from "@/components/library-analytics/lib/dashboards";
import { newInsight } from "@/components/library-analytics/lib/insights";
import { useDock } from "@/components/library-dock/lib/context";
import { type DockTab, NAV_TABS } from "@/components/library-dock/lib/nav-tabs";
import type { ViewMenuSection } from "@/components/library-dock/lib/types";
import { openTrayConfirm } from "@/components/library-dock-confirm-content";
import { useAskAvailable } from "@/hooks/use-ask-available";
import { openInNewTabIfMeta } from "@/hooks/use-tab-navigate";
import { dockMode } from "@/stores/dock-mode";
import { insightEditor } from "@/stores/insight-editor";
import { settingsModal } from "@/stores/settings-modal";
import { tabs } from "@/stores/tabs";
import styles from "./styles.module.css";

function pathForTab(tab: (typeof NAV_TABS)[number]): string | null {
  if (tab.id === "trash") return "/trash";
  if (typeof tab.to === "string") return tab.to;
  return null;
}

const VIEW_MENUS: Array<{
  section: ViewMenuSection;
  label: string;
  icon: React.JSX.Element;
}> = [
  { section: "layout", label: "Layout", icon: <LayoutIcon /> },
  { section: "zoom", label: "Zoom", icon: <ZoomIcon /> },
  { section: "sort", label: "Sort", icon: <SortIcon /> },
  { section: "display", label: "Display", icon: <DisplayIcon /> },
];

/** Destinations first, utilities last, matching how often each is reached for. */
const NAV_ORDER: readonly DockTab[] = [
  "library",
  "sources",
  "analytics",
  "trash",
];

const ORDERED_TABS = NAV_ORDER.flatMap((id) =>
  NAV_TABS.filter((tab) => tab.id === id),
);

export function NavContent() {
  const dock = useDock();
  const askAvailable = useAskAvailable();
  const [tip] = useState(() => Tooltip.createHandle<React.ReactNode>());
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { addDashboard, dashboard, deleteDashboard } = useDashboards();

  const confirmDelete = () => {
    openTrayConfirm({
      title: "Delete Dashboard",
      description: `Deleting removes “${dashboard.name}” and its insights. This can't be undone.`,
      confirmLabel: "Delete Dashboard",
      returnTo: null,
      onConfirm: () => {
        deleteDashboard();
        void navigate({ to: "/analytics" });
      },
    });
  };

  const onDashboard = pathname.startsWith("/analytics/");

  /** The unfold is transient: pointer-down outside the pill or Escape puts the tabs away. */
  useEffect(() => {
    if (!navOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const pill = dock.pillRef.current;
      if (pill && e.target instanceof Node && !pill.contains(e.target)) {
        setNavOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setNavOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen, dock.pillRef]);

  const activeTab =
    ORDERED_TABS.find((tab) => dock.isTabActive(tab.id)) ??
    ORDERED_TABS.find((tab) => tab.id === "library");
  if (!activeTab) return null;

  const actionSet = activeTab.id;

  const activeIndex = ORDERED_TABS.findIndex((tab) => tab.id === activeTab.id);
  const tabsBefore = ORDERED_TABS.slice(0, activeIndex);
  const tabsAfter = ORDERED_TABS.slice(activeIndex + 1);

  const renderTab = (tab: (typeof ORDERED_TABS)[number]) => (
    <Tooltip.Trigger
      key={tab.id}
      handle={tip}
      payload={tab.label}
      render={
        tab.action ? (
          <Tray.Item
            aria-label={tab.label}
            onClick={() => {
              setNavOpen(false);
              tab.action?.();
            }}
          >
            {tab.icon}
          </Tray.Item>
        ) : (
          <Tray.Item
            render={<Link to={tab.to} params={tab.params} />}
            aria-label={tab.label}
            onClick={(e) => {
              setNavOpen(false);
              const path = pathForTab(tab);
              if (path) openInNewTabIfMeta(e, path, () => {});
            }}
            onAuxClick={(e) => {
              if (e.button !== 1) return;
              const path = pathForTab(tab);
              if (!path) return;
              e.preventDefault();
              tabs.open(path, { background: true });
            }}
          >
            {tab.icon}
          </Tray.Item>
        )
      }
    />
  );

  const renderAction = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
  ) => (
    <Tooltip.Trigger
      handle={tip}
      payload={label}
      render={
        <Tray.Item aria-label={label} onClick={onClick}>
          {icon}
        </Tray.Item>
      }
    />
  );

  const unfold = (tabs: typeof ORDERED_TABS, key: string) =>
    tabs.length > 0 ? (
      <motion.div
        key={key}
        className={styles.expand}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "auto", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={dock.quickTransition}
      >
        <div className={styles["expand-inner"]}>{tabs.map(renderTab)}</div>
      </motion.div>
    ) : null;

  return (
    <motion.div
      className={styles.row}
      transition={dock.swapTransition}
      {...dock.swap}
    >
      <AnimatePresence initial={false}>
        {navOpen ? unfold(tabsBefore, "tabs-before") : null}
      </AnimatePresence>

      <Tooltip.Trigger
        handle={tip}
        payload={navOpen ? activeTab.label : "Navigate"}
        render={
          <Tray.Item
            aria-label={navOpen ? activeTab.label : "Navigate"}
            aria-expanded={navOpen}
            data-status="active"
            onClick={() => setNavOpen((v) => !v)}
          >
            <Tray.Indicator />
            {activeTab.icon}
          </Tray.Item>
        }
      />

      <AnimatePresence initial={false}>
        {navOpen ? unfold(tabsAfter, "tabs-after") : null}
      </AnimatePresence>

      {/** Actions follow the page: the cluster refolds whenever the route lands on a tab with a different set. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={actionSet}
          className={styles.expand}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={dock.quickTransition}
        >
          <div className={styles["expand-inner"]}>
            <Tray.Separator />

            {actionSet === "sources" ? (
              <>
                {renderAction("New Source", <Plus />, () =>
                  dockMode.open("source-new"),
                )}
                {renderAction("Sync All", <Sync />, () => {
                  void window.pond.syncRunAll();
                })}
              </>
            ) : actionSet === "analytics" ? (
              onDashboard ? (
                <>
                  {renderAction("Add Insight", <Plus />, () =>
                    insightEditor.open(newInsight(), true),
                  )}
                  {renderAction("Time Range", <Calendar />, () =>
                    dockMode.open("analytics-range"),
                  )}
                  {renderAction("Rename Dashboard", <Pencil />, () =>
                    dockMode.open("analytics-rename"),
                  )}
                  {renderAction("Duplicate Dashboard", <Copy />, () =>
                    dockMode.open("analytics-duplicate"),
                  )}
                  {renderAction("Delete Dashboard", <Trash />, confirmDelete)}
                </>
              ) : (
                renderAction("New Dashboard", <Plus />, () => {
                  const id = addDashboard();
                  void navigate({
                    to: "/analytics/$dashboardId",
                    params: { dashboardId: id },
                  });
                })
              )
            ) : actionSet === "trash" ? (
              VIEW_MENUS.map(({ section, label, icon }) => (
                <Tooltip.Trigger
                  key={section}
                  handle={tip}
                  payload={label}
                  render={
                    <Tray.Item
                      aria-label={label}
                      onClick={() => dock.openViewMenu(section)}
                    >
                      {icon}
                    </Tray.Item>
                  }
                />
              ))
            ) : (
              <>
                <Tray.Item aria-label="New" onClick={dock.openNew}>
                  <Plus />
                </Tray.Item>

                {VIEW_MENUS.map(({ section, label, icon }) => (
                  <Tooltip.Trigger
                    key={section}
                    handle={tip}
                    payload={label}
                    render={
                      <Tray.Item
                        aria-label={label}
                        onClick={() => dock.openViewMenu(section)}
                      >
                        {icon}
                      </Tray.Item>
                    }
                  />
                ))}

                <Tooltip.Trigger
                  handle={tip}
                  payload="Search"
                  render={
                    <Tray.Item aria-label="Search" onClick={dock.openSearch}>
                      <Search />
                    </Tray.Item>
                  }
                />

                {askAvailable ? (
                  <Tooltip.Trigger
                    handle={tip}
                    payload="Ask AI"
                    render={
                      <Tray.Item aria-label="Ask AI" onClick={dock.openAsk}>
                        <Ask />
                      </Tray.Item>
                    }
                  />
                ) : (
                  <Tooltip.Trigger
                    handle={tip}
                    payload="Open Settings → AI to connect a model"
                    render={
                      <Tray.Item
                        aria-label="Open Settings, AI to connect a model"
                        data-disabled="true"
                        onClick={() => settingsModal.open("ai")}
                      >
                        <Ask />
                      </Tray.Item>
                    }
                  />
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <Tooltip.Shared handle={tip} side="top" />
    </motion.div>
  );
}
