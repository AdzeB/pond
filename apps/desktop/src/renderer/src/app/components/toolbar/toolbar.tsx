import {
  IconAlbum2Outline18,
  IconDotsOutline18,
  IconDownloadOutline18,
  IconGear3Outline18,
  IconGlobeOutline18,
  IconMsg2Outline18,
  IconTagsOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { Button, Menu } from "@pond/ui";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChromeHistoryNav } from "@/app/components/chrome-toolbar/chrome-toolbar";
import { InspectorToggle } from "@/features/library/components/agent-toggle/agent-toggle";
import { SidebarToggle } from "@/features/library/components/sidebar-toggle/sidebar-toggle";
import { getLastListPath } from "@/features/library/lib/list-path";
import { useFolders } from "@/features/library/state/folders";
import {
  libraryChrome,
  useLibraryNav,
  useRightPane,
  useSidebarOpen,
} from "@/features/library/state/library-chrome";
import { useViewFilteredCount } from "@/features/library/state/library-view-context";
import {
  resetFilters,
  useHasActiveSearch,
} from "@/features/library/state/view-store";
import { useSave } from "@/features/saves/hooks/use-saves";
import { saveIdFromPath } from "@/features/saves/lib/save-nav";
import { type Breadcrumb, buildBreadcrumbs } from "./breadcrumbs";
import { computeLabel } from "./labels";
import styles from "./toolbar.module.css";

const ROOT_ICONS = {
  "/": IconAlbum2Outline18,
  "/assistant": IconMsg2Outline18,
  "/sources": IconGlobeOutline18,
  "/tags": IconTagsOutline18,
  "/downloads": IconDownloadOutline18,
  "/trash": IconTrash2Outline18,
  "/settings": IconGear3Outline18,
} as const;

function RootIcon({ path }: { path: string }) {
  const Icon =
    Object.entries(ROOT_ICONS).find(([route]) => route === path)?.[1] ??
    (path.startsWith("/settings")
      ? IconGear3Outline18
      : path.startsWith("/source/")
        ? IconGlobeOutline18
        : IconAlbum2Outline18);
  return <Icon aria-hidden="true" />;
}

function Breadcrumbs() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const nav = useLibraryNav();
  const folders = useFolders();
  const save = useSave(saveIdFromPath(pathname));
  const hasActiveSearch = useHasActiveSearch();
  const filteredCount = useViewFilteredCount();
  const crumbs = buildBreadcrumbs({
    pathname,
    listPath: getLastListPath(),
    nav,
    folders,
    saveLabel: computeLabel(pathname, save),
    searchResultCount: hasActiveSearch ? filteredCount : undefined,
  });
  const hidden = crumbs.length > 3 ? crumbs.slice(1, -2) : [];

  function navigate(crumb: Breadcrumb) {
    if (crumb.nav) libraryChrome.setNav(crumb.nav);
    if (crumb.nav?.kind === "all" && crumb.path === "/") resetFilters();
    router.history.push(crumb.path);
  }

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.trail}>
        {crumbs.map((crumb, index) => {
          if (hidden.length && index > 1 && index < crumbs.length - 2)
            return null;
          if (hidden.length && index === 1) {
            return (
              <li className={styles.overflow} key="ancestors">
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
                <Menu.Root>
                  <Menu.Trigger
                    icon
                    variant="ghost"
                    size="sm"
                    rounding="rounded"
                    className={styles.more}
                    aria-label="Show Parent Folders"
                  >
                    <IconDotsOutline18 />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner align="start" side="bottom">
                      <Menu.Popup>
                        <Menu.Items
                          items={hidden.map((parent) => ({
                            label: parent.label,
                            onClick: () => navigate(parent),
                          }))}
                        />
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </li>
            );
          }
          const current = index === crumbs.length - 1;
          return (
            <li
              key={
                crumb.nav?.kind === "folder"
                  ? `folder:${crumb.nav.id}`
                  : `${crumb.path}:${crumb.nav?.kind ?? "save"}`
              }
              className={styles.segment}
              data-current={current || undefined}
            >
              {index > 0 ? (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              ) : null}
              {current ? (
                <span
                  className={styles.current}
                  aria-current="page"
                  title={crumb.label}
                >
                  {index === 0 ? <RootIcon path={crumb.path} /> : null}
                  <span className={styles.label}>{crumb.label}</span>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  rounding="rounded"
                  className={styles.crumb}
                  title={crumb.label}
                  onClick={() => navigate(crumb)}
                >
                  {index === 0 ? <RootIcon path={crumb.path} /> : null}
                  <span className={styles.label}>{crumb.label}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Toolbar() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const hideInspector =
    pathname === "/assistant" || pathname.startsWith("/settings");
  const sidebarOpen = useSidebarOpen();
  const rightPane = useRightPane();
  return (
    <div className={styles.bar}>
      <div className={styles.chrome}>
        <SidebarToggle open={sidebarOpen} />
        <ChromeHistoryNav />
      </div>
      <div className={styles.main}>
        <Breadcrumbs />
      </div>
      <div className={styles.actions}>
        {hideInspector ? null : <InspectorToggle open={rightPane !== null} />}
      </div>
    </div>
  );
}
