import { IconAlbum2Outline18, IconDotsOutline18 } from "@pond/icons/outline/18";
import { Button, Menu } from "@pond/ui";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { InspectorToggle } from "@/components/library/agent-toggle";
import { SidebarToggle } from "@/components/library/sidebar-toggle";
import { ChromeHistoryNav } from "@/components/shell/chrome-toolbar";
import { useSave } from "@/hooks/use-saves";
import { getLastListPath } from "@/lib/ui/list-path";
import { saveIdFromPath } from "@/lib/ui/save-nav";
import { useFolders } from "@/stores/folders";
import {
  libraryChrome,
  useLibraryNav,
  useRightPane,
  useSidebarOpen,
} from "@/stores/library-chrome";
import { resetFilters } from "@/stores/view-store";
import { type Breadcrumb, buildBreadcrumbs } from "./breadcrumbs";
import { computeLabel } from "./labels";
import styles from "./styles.module.css";

function Breadcrumbs() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const nav = useLibraryNav();
  const folders = useFolders();
  const save = useSave(saveIdFromPath(pathname));
  const crumbs = buildBreadcrumbs({
    pathname,
    listPath: getLastListPath(),
    nav,
    folders,
    saveLabel: computeLabel(pathname, save),
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
                  {index === 0 ? (
                    <IconAlbum2Outline18 aria-hidden="true" />
                  ) : null}
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
                  {index === 0 ? (
                    <IconAlbum2Outline18 aria-hidden="true" />
                  ) : null}
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
