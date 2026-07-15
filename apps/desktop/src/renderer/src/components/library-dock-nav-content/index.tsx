import {
  IconSparkle3Fill18 as Ask,
  IconEyeFill18 as DisplayIcon,
  IconGridFill18 as LayoutIcon,
  IconArchivePlusFill18 as New,
  IconDescendingSortingFill18 as SortIcon,
  IconSizeFill18 as ZoomIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip, Tray } from "@pond/ui";
import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import type { ViewMenuSection } from "@/components/library-dock/lib/types";
import { useAgentAvailable } from "@/hooks/use-agent-available";
import { settingsModal } from "@/stores/settings-modal";
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
    <motion.div
      className={styles.row}
      transition={dock.swapTransition}
      {...dock.swap}
    >
      <Tray.Item aria-label="New" onClick={dock.openNew}>
        <New />
      </Tray.Item>

      <Tray.Separator />

      {VIEW_MENUS.map(({ section, label, icon }) => (
        <Tooltip key={section} label={label} side="top">
          <Tray.Item
            aria-label={label}
            onClick={() => dock.openViewMenu(section)}
          >
            {icon}
          </Tray.Item>
        </Tooltip>
      ))}

      <Tray.Separator />

      <Tooltip label="Search" side="top">
        <Tray.Item aria-label="Search" onClick={dock.openSearch}>
          <Search />
        </Tray.Item>
      </Tooltip>

      {agentAvailable ? (
        <Tooltip label="Ask AI" side="top">
          <Tray.Item aria-label="Ask AI" onClick={dock.openAsk}>
            <Ask />
          </Tray.Item>
        </Tooltip>
      ) : (
        <Tooltip label="Connect an AI model to ask" side="top">
          <Tray.Item
            aria-label="Connect an AI model to ask"
            data-disabled="true"
            onClick={() => settingsModal.open("ai-models")}
          >
            <Ask />
          </Tray.Item>
        </Tooltip>
      )}
    </motion.div>
  );
}
