import {
  IconBarsFilterFill18 as Funnel,
  IconMagnifierFill18 as Magnifier,
  IconArchivePlusFill18 as Plus,
  IconGearFill18 as Settings,
  IconSliders2VerticalFill18 as Sliders,
  IconArrowsRotateCenterFill18 as Sync,
  IconTrash2Fill18 as Trash,
} from "@pond/icons/fill/18";
import { Tooltip, useToast } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { FilterPanel } from "@/components/library-filter-panel";
import { focusSearchInput } from "@/components/library-toolbar/constants";
import { ViewOptionsMenu } from "@/components/library-view-menu/options-menu";
import { useSidebarNav } from "@/hooks/use-sidebar-nav";
import { formatNumber } from "@/lib/format";
import { trashSaves } from "@/lib/mutate-save";
import {
  selection,
  useSelectedIds,
  useSelectionSize,
} from "@/stores/selection";
import { syncMonitor, useAnySyncRunning } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

// Floating bottom nav pill, grouped into navigation, view tools, app actions, and a selection cluster shown when cards are selected.
const DOCK_NAV_KEYS = new Set(["library", "untagged", "recents", "trash"]);

export function Dock() {
  const selectionSize = useSelectionSize();

  return (
    <nav className={styles.dock} aria-label="Primary navigation">
      <div className={styles.pill}>
        <NavGroup />
        <span className={styles.divider} aria-hidden />
        <ToolsGroup />
        <span className={styles.divider} aria-hidden />
        <ActionsGroup />
        {selectionSize > 0 ? <SelectionGroup count={selectionSize} /> : null}
      </div>
    </nav>
  );
}

function NavGroup() {
  const { visibleItems } = useSidebarNav();
  const navItems = visibleItems.filter(({ item }) =>
    DOCK_NAV_KEYS.has(item.key),
  );

  return (
    <>
      {navItems.map(({ item, count }) => (
        <Tooltip
          key={item.key}
          label={
            count > 0 ? `${item.label} · ${formatNumber(count)}` : item.label
          }
          side="top"
        >
          <Link
            to={item.path}
            params={item.params}
            activeOptions={item.path === "/" ? { exact: true } : undefined}
            className={styles.item}
            aria-label={item.label}
          >
            <span className={styles.icon}>{item.icon}</span>
          </Link>
        </Tooltip>
      ))}
    </>
  );
}

function ToolsGroup() {
  const syncRunning = useAnySyncRunning();

  return (
    <>
      <Tooltip label="Search" side="top">
        <button
          type="button"
          className={styles.item}
          aria-label="Search"
          onClick={focusSearchInput}
        >
          <span className={styles.icon}>
            <Magnifier />
          </span>
        </button>
      </Tooltip>

      <Tooltip label="Filter" side="top">
        <FilterPanel side="top" align="start">
          <button type="button" className={styles.item} aria-label="Filter">
            <span className={styles.icon}>
              <Funnel />
            </span>
          </button>
        </FilterPanel>
      </Tooltip>

      <Tooltip label="View options" side="top">
        <ViewOptionsMenu
          side="top"
          align="start"
          trigger={
            <button
              type="button"
              className={styles.item}
              aria-label="View options"
            >
              <span className={styles.icon}>
                <Sliders />
              </span>
            </button>
          }
        />
      </Tooltip>

      <Tooltip label="Sync status" side="top">
        <button
          type="button"
          className={styles.item}
          aria-label="Sync status"
          onClick={() => syncMonitor.open()}
        >
          <span className={styles.icon}>
            <Sync />
          </span>
          {syncRunning ? <span className={styles.syncDot} aria-hidden /> : null}
        </button>
      </Tooltip>
    </>
  );
}

function ActionsGroup() {
  return (
    <>
      <Tooltip label="New" side="top">
        <button type="button" className={styles.item} aria-label="New">
          <span className={styles.icon}>
            <Plus />
          </span>
        </button>
      </Tooltip>

      <Tooltip label="Settings" side="top">
        <Link to="/settings" className={styles.item} aria-label="Settings">
          <span className={styles.icon}>
            <Settings />
          </span>
        </Link>
      </Tooltip>
    </>
  );
}

function SelectionGroup({ count }: { count: number }) {
  const toast = useToast();
  const ids = useSelectedIds();

  const moveToTrash = async () => {
    const moved = await trashSaves(ids);
    selection.clear();
    toast.add({
      title: `Moved ${formatNumber(moved)} to trash`,
      type: "success",
    });
  };

  return (
    <>
      <span className={styles.divider} aria-hidden />
      <span
        className={styles.count}
        role="status"
        aria-label={`${formatNumber(count)} selected`}
      >
        {formatNumber(count)}
      </span>

      <Tooltip label="Move to trash" side="top">
        <button
          type="button"
          className={`${styles.item} ${styles.danger}`}
          aria-label="Move selected to trash"
          onClick={moveToTrash}
        >
          <span className={styles.icon}>
            <Trash />
          </span>
        </button>
      </Tooltip>

      <button
        type="button"
        className={styles.clear}
        aria-label="Clear selection"
        onClick={() => selection.clear()}
      >
        Clear
      </button>
    </>
  );
}
