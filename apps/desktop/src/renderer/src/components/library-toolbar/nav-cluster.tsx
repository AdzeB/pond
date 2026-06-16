import {
  IconArchivePlusFill18 as Plus,
  IconGearFill18 as Settings,
  IconArrowsRotateCenterFill18 as Sync,
} from "@pond/icons/fill/18";
import { Tooltip } from "@pond/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Glass } from "@/components/liquid-glass";
import { useSidebarNav } from "@/hooks/use-sidebar-nav";
import { formatNumber } from "@/lib/format";
import { bouncySpring, snappySpring } from "@/lib/motion";
import { settings } from "@/stores/settings-dialog";
import { syncMonitor, useAnySyncRunning } from "@/stores/sync-monitor";
import styles from "./nav-cluster.module.css";

const NAV_KEYS = new Set(["library", "trash"]);

export function NavCluster() {
  const { visibleItems } = useSidebarNav();
  const syncRunning = useAnySyncRunning();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = visibleItems.filter(({ item }) => NAV_KEYS.has(item.key));

  return (
    <Glass as="nav" className={styles.cluster} aria-label="Primary navigation">
      {navItems.map(({ item, count }) => {
        const active =
          item.path === "/"
            ? pathname === "/"
            : pathname === `/${item.params?.mode}`;
        return (
          <Tooltip
            key={item.key}
            label={
              count > 0 ? `${item.label} · ${formatNumber(count)}` : item.label
            }
            side="bottom"
          >
            <Link
              to={item.path}
              params={item.params}
              activeOptions={item.path === "/" ? { exact: true } : undefined}
              className={styles.item}
              aria-label={item.label}
            >
              {active ? (
                <motion.span
                  layoutId="toolbarNavActive"
                  className={styles.activeIndicator}
                  transition={bouncySpring}
                  aria-hidden
                />
              ) : null}
              <span className={styles.icon}>{item.icon}</span>
            </Link>
          </Tooltip>
        );
      })}

      <span className={styles.divider} aria-hidden />

      <Tooltip label="Sync status" side="bottom">
        <button
          type="button"
          className={styles.item}
          aria-label="Sync status"
          onClick={() => syncMonitor.open()}
        >
          <span className={styles.icon}>
            <Sync />
          </span>
          <AnimatePresence>
            {syncRunning ? (
              <motion.span
                className={styles.syncDot}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={snappySpring}
                aria-hidden
              />
            ) : null}
          </AnimatePresence>
        </button>
      </Tooltip>

      <Tooltip label="New" side="bottom">
        <button type="button" className={styles.item} aria-label="New">
          <span className={styles.icon}>
            <Plus />
          </span>
        </button>
      </Tooltip>

      <Tooltip label="Settings" side="bottom">
        <button
          type="button"
          className={styles.item}
          aria-label="Settings"
          onClick={() => settings.open()}
        >
          <span className={styles.icon}>
            <Settings />
          </span>
        </button>
      </Tooltip>
    </Glass>
  );
}
