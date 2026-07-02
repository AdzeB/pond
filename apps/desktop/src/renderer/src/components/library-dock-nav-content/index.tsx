import {
  IconSparkleFill18 as Ask,
  IconArchivePlusFill18 as New,
  IconSizeFill18 as ViewIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import { NAV_TABS } from "@/components/library-dock/lib/nav-tabs";
import { LibrarySwitcher } from "@/components/library-switcher";
import { ViewMenu } from "@/components/library-view-menu";
import { useAgentAvailable } from "@/hooks/use-agent-available";
import { bouncySpring, gentleSpring } from "@/lib/ui/motion";
import { newSave } from "@/stores/new-save";
import styles from "./styles.module.css";

export function NavContent() {
  const dock = useDock();
  const agentAvailable = useAgentAvailable();

  return (
    <motion.div
      key="nav"
      className={styles.row}
      layout="position"
      {...dock.swap}
      transition={bouncySpring}
    >
      <LibrarySwitcher variant="dock" />
      <button
        type="button"
        className={styles.item}
        aria-label="New"
        onClick={() => newSave.open()}
      >
        <New />
      </button>

      <span className={styles.separator} aria-hidden />

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

      <span className={styles.separator} aria-hidden />

      <Tooltip label="Search" side="top">
        <button
          type="button"
          className={styles.item}
          aria-label="Search"
          onClick={dock.openSearch}
        >
          <Search />
        </button>
      </Tooltip>

      {agentAvailable ? (
        <Tooltip label="Ask AI" side="top">
          <button
            type="button"
            className={styles.item}
            aria-label="Ask AI"
            onClick={dock.openAsk}
          >
            <Ask />
          </button>
        </Tooltip>
      ) : (
        <Tooltip label="Connect an AI model to ask" side="top">
          <Link
            to="/settings/$section"
            params={{ section: "ai-models" }}
            className={styles.item}
            aria-label="Connect an AI model to ask"
            aria-disabled="true"
            data-disabled="true"
          >
            <Ask />
          </Link>
        </Tooltip>
      )}

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
