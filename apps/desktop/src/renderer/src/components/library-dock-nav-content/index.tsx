import {
  IconSparkleFill18 as Ask,
  IconArchivePlusFill18 as New,
  IconGearFill18 as SettingsIcon,
  IconSizeFill18 as ViewIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import { NAV_TABS } from "@/components/library-dock/lib/nav-tabs";
import { useAgentAvailable } from "@/hooks/use-agent-available";
import { usePonds } from "@/hooks/use-ponds";
import { gentleSpring } from "@/lib/ui/motion";
import { glyphKind, PondGlyph } from "@/lib/ui/pond-icons";
import styles from "./styles.module.css";

export function NavContent() {
  const dock = useDock();
  const agentAvailable = useAgentAvailable();
  const { active } = usePonds();

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.libraryTrigger}
        aria-label={`Library menu (${active?.name ?? "Library"})`}
        onClick={dock.openLibrary}
      >
        <span
          className={styles.glyph}
          data-icon={
            active && glyphKind(active.avatar) === "icon" ? true : undefined
          }
          style={{ background: active?.color ?? undefined }}
        >
          {active ? (
            <PondGlyph
              avatar={active.avatar}
              name={active.name}
              iconSize={16}
            />
          ) : (
            "P"
          )}
        </span>
      </button>
      <button
        type="button"
        className={styles.item}
        aria-label="New"
        onClick={dock.openNew}
      >
        <New />
      </button>

      <Tooltip label="Settings" side="top">
        <Link
          to="/settings"
          className={styles.item}
          aria-label="Settings"
          data-status={dock.isTabActive("settings") ? "active" : undefined}
        >
          <SettingsIcon />
        </Link>
      </Tooltip>

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
    </div>
  );
}
