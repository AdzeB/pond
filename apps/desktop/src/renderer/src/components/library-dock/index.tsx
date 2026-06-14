import {
  IconArchivePlusFill18 as Plus,
  IconGearFill18 as Settings,
  IconSliders2VerticalFill18 as Sliders,
  IconArrowsRotateCenterFill18 as Sync,
  IconTrash2Fill18 as Trash,
} from "@pond/icons/fill/18";
import { Tooltip, useToast } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { PondSwitcher } from "@/components/library-pond-switcher";
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

const DOCK_NAV_KEYS = new Set(["library", "trash"]);

export function Dock() {
  const selectionSize = useSelectionSize();
  const { visibleItems } = useSidebarNav();
  const syncRunning = useAnySyncRunning();

  const navItems = visibleItems.filter(({ item }) =>
    DOCK_NAV_KEYS.has(item.key),
  );

  return (
    <nav className={styles.dock} aria-label="Primary navigation">
      <div className={styles.pill}>
        <PondSwitcher compact className={styles.item} />

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
            {syncRunning ? (
              <span className={styles.syncDot} aria-hidden />
            ) : null}
          </button>
        </Tooltip>

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
      </div>
      {selectionSize > 0 ? <SelectionGroup count={selectionSize} /> : null}
    </nav>
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
