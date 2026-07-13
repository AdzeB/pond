import {
  IconSparkle3Fill18 as Ask,
  IconEyeFill18 as DisplayIcon,
  IconGridFill18 as LayoutIcon,
  IconArchivePlusFill18 as New,
  IconDescendingSortingFill18 as SortIcon,
  IconSizeFill18 as ZoomIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { useDock } from "@/components/library-dock/lib/context";
import type { ViewMenuSection } from "@/components/library-dock/lib/types";
import { useAgentAvailable } from "@/hooks/use-agent-available";
import styles from "./styles.module.css";

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

      <span className={styles.separator} aria-hidden />

      {VIEW_MENUS.map(({ section, label, icon }) => (
        <Tooltip key={section} label={label} side="top">
          <button
            type="button"
            className={styles.item}
            aria-label={label}
            onClick={() => dock.openViewMenu(section)}
          >
            {icon}
          </button>
        </Tooltip>
      ))}

      <span className={styles.separator} aria-hidden />

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
    </div>
  );
}
