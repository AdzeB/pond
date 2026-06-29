import {
  IconMagnifierFill18 as Search,
  IconSizeFill18 as ViewIcon,
} from "@pond/icons/fill/18";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import { NAV_TABS } from "@/components/library-dock/lib/nav-tabs";
import { ViewMenu } from "@/components/library-view-menu";
import { bouncySpring, gentleSpring } from "@/lib/ui/motion";
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
      <button
        type="button"
        className={styles.item}
        aria-label="Ask anything"
        onClick={dock.openAsk}
      >
        <Search />
      </button>

      {NAV_TABS.map((tab) => {
        const active = dock.isTabActive(tab.id);
        return (
          <Link
            key={tab.label}
            to={tab.to}
            params={tab.params}
            className={styles.item}
            aria-label={tab.label}
            data-status={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {active ? (
              <motion.span
                layoutId="dock-active-tab"
                className={styles.indicator}
                transition={gentleSpring}
                aria-hidden
              />
            ) : null}
            {tab.icon}
          </Link>
        );
      })}

      <ViewMenu
        side="top"
        align="center"
        anchor={() => dock.pillRef.current}
        trigger={
          <button
            type="button"
            className={styles.item}
            aria-label="View options"
          >
            <ViewIcon />
          </button>
        }
      />
    </motion.div>
  );
}
