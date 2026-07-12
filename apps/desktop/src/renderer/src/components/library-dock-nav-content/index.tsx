import {
  IconSparkle3Fill18 as Ask,
  IconArchivePlusFill18 as New,
  IconSizeFill18 as ViewIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import { NAV_TABS } from "@/components/library-dock/lib/nav-tabs";
import { useAgentAvailable } from "@/hooks/use-agent-available";
import { gentleSpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

export function NavContent() {
  const dock = useDock();
  const agentAvailable = useAgentAvailable();

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.item}
        aria-label="New"
        onClick={dock.openNew}
      >
        <New />
      </button>

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

      <Tooltip label="View options" side="top">
        <button
          type="button"
          className={styles.item}
          aria-label="View options"
          onClick={dock.openOptions}
        >
          <ViewIcon />
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

    </div>
  );
}
