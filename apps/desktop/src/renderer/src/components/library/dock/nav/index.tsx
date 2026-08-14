import { Tooltip, Tray } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import { type DockTab, NAV_TABS } from "@/components/library/dock/lib/nav-tabs";
import { ShortcutKeys } from "@/components/shared/shortcut-keys";
import { openInNewTabIfMeta } from "@/hooks/use-tab-navigate";
import type { ShortcutId } from "@/lib/save/shortcuts";
import { tabs } from "@/stores/tabs";
import { NavActions } from "./nav-actions";
import styles from "./styles.module.css";

function pathForTab(tab: (typeof NAV_TABS)[number]): string | null {
  if (tab.id === "trash") return "/trash";
  if (typeof tab.to === "string") return tab.to;
  return null;
}

const TAB_SHORTCUT: Record<DockTab, ShortcutId> = {
  library: "nav.library",
  sources: "nav.sources",
  trash: "nav.trash",
};

/** Destinations first, utilities last, matching how often each is reached for. */
const NAV_ORDER: readonly DockTab[] = ["library", "trash", "sources"];

const ORDERED_TABS = NAV_ORDER.flatMap((id) =>
  NAV_TABS.filter((tab) => tab.id === id),
);

function tabTip(tab: (typeof ORDERED_TABS)[number]) {
  return Tooltip.Label(tab.label, <ShortcutKeys id={TAB_SHORTCUT[tab.id]} />);
}

export function NavContent() {
  const dock = useDock();
  const [tip] = useState(() => Tooltip.createHandle<ReactNode>());

  const activeTab =
    ORDERED_TABS.find((tab) => dock.isTabActive(tab.id)) ??
    ORDERED_TABS.find((tab) => tab.id === "library");
  if (!activeTab) return null;

  const actionSet = activeTab.id;

  const renderTab = (tab: (typeof ORDERED_TABS)[number]) => {
    const active = tab.id === activeTab.id;
    return (
      <Tooltip.Trigger
        key={tab.id}
        handle={tip}
        payload={tabTip(tab)}
        render={
          tab.action ? (
            <Tray.Item
              aria-label={tab.label}
              data-status={active ? "active" : undefined}
              onClick={() => tab.action?.()}
            >
              {active ? <Tray.Indicator /> : null}
              {tab.icon}
            </Tray.Item>
          ) : (
            <Tray.Item
              render={<Link to={tab.to} params={tab.params} />}
              aria-label={tab.label}
              data-status={active ? "active" : undefined}
              onClick={(e) => {
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
              {active ? <Tray.Indicator /> : null}
              {tab.icon}
            </Tray.Item>
          )
        }
      />
    );
  };

  return (
    <motion.div
      className={styles.row}
      transition={dock.swapTransition}
      {...dock.swap}
    >
      {ORDERED_TABS.map(renderTab)}

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
            <NavActions actionSet={actionSet} tip={tip} />
          </div>
        </motion.div>
      </AnimatePresence>

      <Tooltip.Shared handle={tip} side="top" />
    </motion.div>
  );
}
