import {
  IconArchivePlusFill18 as New,
  IconMagnifierFill18 as Search,
  IconNutFill18 as Settings,
  IconRulerCursorFill18 as ViewIcon,
} from "@pond/icons/fill/18";
import { Tooltip } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LibrarySwitcher } from "@/components/library-switcher";
import { ViewMenu } from "@/components/library-view-menu";
import { bouncySpring } from "@/lib/motion";
import { useDock } from "./context";
import { NAV_TABS } from "./nav-tabs";
import styles from "./styles.module.css";

export function NavContent() {
  const dock = useDock();

  return (
    <motion.div
      key="nav"
      className={styles.row}
      layout="position"
      {...dock.swap}
      transition={bouncySpring}
    >
      <Tooltip.Trigger
        handle={dock.tooltip}
        className={styles.item}
        payload="Ask anything"
        aria-label="Ask anything"
        render={
          <button type="button" onClick={dock.openAsk}>
            <Search />
          </button>
        }
      />

      <span className={styles.separator} aria-hidden />

      {NAV_TABS.map((tab) => {
        const active = dock.isTabActive(tab.id);
        return (
          <Tooltip.Trigger
            key={tab.label}
            handle={dock.tooltip}
            className={styles.item}
            payload={tab.label}
            render={
              <Link
                to={tab.to}
                params={tab.params}
                data-status={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span className={styles.indicator} aria-hidden />
                ) : null}
                {tab.icon}
              </Link>
            }
            aria-label={tab.label}
          />
        );
      })}

      <span className={styles.separator} aria-hidden />

      <Tooltip.Trigger
        handle={dock.tooltip}
        className={styles.item}
        payload="New"
        aria-label="New"
        render={
          <button type="button" onClick={dock.openNewSave}>
            <New />
          </button>
        }
      />

      <ViewMenu
        side="top"
        align="center"
        anchor={() => dock.pillRef.current}
        trigger={
          <Tooltip.Trigger
            handle={dock.tooltip}
            className={styles.item}
            payload="View options"
            aria-label="View options"
            render={
              <button type="button">
                <ViewIcon />
              </button>
            }
          />
        }
      />

      <Tooltip.Trigger
        handle={dock.tooltip}
        className={styles.item}
        payload="Settings"
        aria-label="Settings"
        render={
          <Link
            to="/settings"
            data-status={dock.isTabActive("settings") ? "active" : undefined}
          >
            {dock.isTabActive("settings") ? (
              <span className={styles.indicator} aria-hidden />
            ) : null}
            <Settings />
          </Link>
        }
      />

      <span className={styles.separator} aria-hidden />

      <LibrarySwitcher variant="dock" />
    </motion.div>
  );
}
