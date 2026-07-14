import { Tooltip } from "@pond/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { NAV_TABS } from "@/components/library-dock/lib/nav-tabs";
import { gentleSpring } from "@/lib/ui/motion";
import { useSettingsModal } from "@/stores/settings-modal";
import styles from "./styles.module.css";

const MAIN_TABS = ["library", "sources", "analytics", "saves"] as const;
const UTILITY_TABS = ["trash", "settings"] as const;

const byId = (ids: readonly string[]) =>
  ids.flatMap((id) => NAV_TABS.filter((t) => t.id === id));

const MAIN = byId(MAIN_TABS);
const UTILITY = byId(UTILITY_TABS);

/** Holds the destination tabs so the library tray stays a compact action/composer surface. */
export function NavigationRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settingsOpen = useSettingsModal().section != null;

  /** The playground pins its control panel to the same left edge. */
  if (pathname === "/components" || pathname === "/playground") {
    return null;
  }

  const isActive = (tabId: string): boolean => {
    if (tabId === "settings") return settingsOpen;
    const tab = NAV_TABS.find((t) => t.id === tabId);
    return tab ? tab.match(pathname) : false;
  };

  const renderTab = (tab: (typeof NAV_TABS)[number]) => {
    const active = isActive(tab.id);
    const indicator = active ? (
      <motion.span
        layoutId="rail-active-tab"
        className={styles.indicator}
        transition={gentleSpring}
        aria-hidden
      />
    ) : null;

    return (
      <Tooltip key={tab.id} label={tab.label} side="right">
        {tab.action ? (
          <button
            type="button"
            className={styles.item}
            aria-label={tab.label}
            data-status={active ? "active" : undefined}
            onClick={tab.action}
          >
            {indicator}
            {tab.icon}
          </button>
        ) : (
          <Link
            to={tab.to}
            params={tab.params}
            className={styles.item}
            aria-label={tab.label}
            data-status={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {indicator}
            {tab.icon}
          </Link>
        )}
      </Tooltip>
    );
  };

  return (
    <nav className={styles.rail} aria-label="Navigation">
      <div className={styles.pill}>
        {MAIN.map(renderTab)}
        <span className={styles.separator} aria-hidden />
        {UTILITY.map(renderTab)}
      </div>
    </nav>
  );
}
