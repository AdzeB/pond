import { Tray } from "@pond/ui";
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
      <Tray.Indicator
        render={
          <motion.span layoutId="rail-active-tab" transition={gentleSpring} />
        }
      />
    ) : null;

    return tab.action ? (
      <Tray.Item
        key={tab.id}
        aria-label={tab.label}
        data-status={active ? "active" : undefined}
        onClick={tab.action}
      >
        {indicator}
        {tab.icon}
      </Tray.Item>
    ) : (
      <Tray.Item
        key={tab.id}
        render={<Link to={tab.to} params={tab.params} />}
        aria-label={tab.label}
        data-status={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
      >
        {indicator}
        {tab.icon}
      </Tray.Item>
    );
  };

  return (
    <Tray.Pill
      orientation="vertical"
      className={styles.rail}
      render={<nav aria-label="Navigation" />}
    >
      {MAIN.map(renderTab)}
      <Tray.Separator />
      {UTILITY.map(renderTab)}
    </Tray.Pill>
  );
}
