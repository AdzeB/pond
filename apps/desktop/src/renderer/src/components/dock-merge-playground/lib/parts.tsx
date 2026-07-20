import {
  IconChartFill18 as Analytics,
  IconSparkle3Fill18 as Ask,
  IconCalendarFill18 as Calendar,
  IconEyeFill18 as Display,
  IconDotsFill18 as Dots,
  IconGridFill18 as Layout,
  IconArchiveContent2Fill18 as Library,
  IconArchivePlusFill18 as New,
  IconPlusFill18 as Plus,
  IconClockRotateClockwiseFill18 as Retry,
  IconUploadFill18 as Saves,
  IconGear3Fill18 as Settings,
  IconDescendingSortingFill18 as Sort,
  IconGlobeFill18 as Sources,
  IconRefreshFill18 as Sync,
  IconTrash2ContentFill18 as Trash,
  IconSizeFill18 as Zoom,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip, Tray } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { gentleSpring } from "@/lib/ui/motion";
import styles from "../variants.module.css";

/** Static copies of the rail's tabs and the dock's actions so variants stay pure layout, decoupled from router and stores. */

export type TabId =
  | "library"
  | "sources"
  | "analytics"
  | "saves"
  | "trash"
  | "settings";

export interface MockTab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

export interface MockAction {
  id: string;
  label: string;
  icon: ReactNode;
}

export const MAIN_TABS: readonly MockTab[] = [
  { id: "library", label: "Library", icon: <Library /> },
  { id: "sources", label: "Sources", icon: <Sources /> },
  { id: "analytics", label: "Analytics", icon: <Analytics /> },
  { id: "saves", label: "Saves", icon: <Saves /> },
];

export const UTILITY_TABS: readonly MockTab[] = [
  { id: "trash", label: "Trash", icon: <Trash /> },
  { id: "settings", label: "Settings", icon: <Settings /> },
];

export const ALL_TABS: readonly MockTab[] = [...MAIN_TABS, ...UTILITY_TABS];

export const PRIMARY_ACTION: MockAction = {
  id: "new",
  label: "New",
  icon: <New />,
};

export const VIEW_ACTIONS: readonly MockAction[] = [
  { id: "layout", label: "Layout", icon: <Layout /> },
  { id: "zoom", label: "Zoom", icon: <Zoom /> },
  { id: "sort", label: "Sort", icon: <Sort /> },
  { id: "display", label: "Display", icon: <Display /> },
];

export const COMPOSER_ACTIONS: readonly MockAction[] = [
  { id: "search", label: "Search", icon: <Search /> },
  { id: "ask", label: "Ask AI", icon: <Ask /> },
];

interface ActionSet {
  /** Tabs sharing a key (library and trash) crossfade nothing when switching between them. */
  key: string;
  groups: readonly (readonly MockAction[])[];
}

const LIBRARY_GROUPS: ActionSet["groups"] = [
  [PRIMARY_ACTION],
  VIEW_ACTIONS,
  COMPOSER_ACTIONS,
];

/** Mirrors what each real page offers today: library and trash share the grid actions, the rest carry their own header actions, settings has none. */
export const TAB_ACTIONS: Record<TabId, ActionSet> = {
  library: { key: "library", groups: LIBRARY_GROUPS },
  trash: { key: "library", groups: LIBRARY_GROUPS },
  sources: {
    key: "sources",
    groups: [
      [
        { id: "new-source", label: "New source", icon: <Plus /> },
        { id: "sync-all", label: "Sync all", icon: <Sync /> },
      ],
    ],
  },
  analytics: {
    key: "analytics",
    groups: [
      [
        { id: "add-insight", label: "Add insight", icon: <Plus /> },
        { id: "time-range", label: "Time range", icon: <Calendar /> },
        { id: "dashboard-menu", label: "Dashboard actions", icon: <Dots /> },
      ],
    ],
  },
  saves: {
    key: "saves",
    groups: [[{ id: "retry-failed", label: "Retry failed", icon: <Retry /> }]],
  },
  settings: { key: "settings", groups: [] },
};

export interface VariantProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

type TooltipSide = "top" | "right" | "bottom" | "left";

export function TabItem({
  tab,
  activeTab,
  onTabChange,
  layoutId,
  side = "top",
}: {
  tab: MockTab;
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  /** Scopes the sliding indicator to one variant so switching tabs animates within it. */
  layoutId: string;
  side?: TooltipSide;
}) {
  const active = tab.id === activeTab;
  return (
    <Tooltip label={tab.label} side={side}>
      <Tray.Item
        aria-label={tab.label}
        data-status={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => onTabChange(tab.id)}
      >
        {active ? (
          <Tray.Indicator
            render={
              <motion.span layoutId={layoutId} transition={gentleSpring} />
            }
          />
        ) : null}
        {tab.icon}
      </Tray.Item>
    </Tooltip>
  );
}

export function ActionItem({
  action,
  side = "top",
}: {
  action: MockAction;
  side?: TooltipSide;
}) {
  return (
    <Tooltip label={action.label} side={side}>
      <Tray.Item aria-label={action.label}>{action.icon}</Tray.Item>
    </Tooltip>
  );
}

/** The current dock's action cluster (New | view menus | Search, Ask) so variants only decide where it sits. */
export function ActionCluster({ side = "top" }: { side?: TooltipSide }) {
  return (
    <>
      <ActionItem action={PRIMARY_ACTION} side={side} />
      <Tray.Separator />
      {VIEW_ACTIONS.map((action) => (
        <ActionItem key={action.id} action={action} side={side} />
      ))}
      <Tray.Separator />
      {COMPOSER_ACTIONS.map((action) => (
        <ActionItem key={action.id} action={action} side={side} />
      ))}
    </>
  );
}

/** Actions follow the page: the cluster width-morphs to the active tab's set and collapses entirely when the page (or a nav unfold) leaves no room for verbs. */
export function ContextActionCluster({
  activeTab,
  side = "top",
  leadingSeparator = true,
  hidden = false,
}: {
  activeTab: TabId;
  side?: TooltipSide;
  /** Off when the cluster stands alone in its own pill instead of trailing the nav zone. */
  leadingSeparator?: boolean;
  hidden?: boolean;
}) {
  const set = TAB_ACTIONS[activeTab];
  return (
    <AnimatePresence initial={false}>
      {!hidden && set.groups.length > 0 ? (
        <motion.div
          key={set.key}
          className={styles.expand}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={gentleSpring}
        >
          <div className={styles["expand-inner"]}>
            {leadingSeparator ? <Tray.Separator /> : null}
            {set.groups.map((group, index) => (
              <Fragment key={group[0]?.id ?? index}>
                {index > 0 ? <Tray.Separator /> : null}
                {group.map((action) => (
                  <ActionItem key={action.id} action={action} side={side} />
                ))}
              </Fragment>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
