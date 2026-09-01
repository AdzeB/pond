import { Shell } from "@pond/ui";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { LibraryChrome } from "@/components/library/chrome";
import { AppShell } from "@/components/shell/app-shell";
import {
  ScrollRestorationContext,
  useScrollRestoration,
} from "@/hooks/use-scroll-restoration";
import {
  getLastListPath,
  getLastListSearch,
  rememberListPath,
} from "@/lib/ui/list-path";
import { saveIdFromPath } from "@/lib/ui/save-nav";
import { LibraryView } from "@/routes/_library/-library-view";
import styles from "./styles.module.css";

export function Library() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const isSave = saveIdFromPath(pathname) !== null;
  const isSources = pathname.startsWith("/sources");
  const isDownloads = pathname.startsWith("/downloads");
  const isAssistant = pathname === "/assistant";
  const isTags = pathname === "/tags";
  const showLibraryGrid = !isSources && !isDownloads && !isAssistant && !isTags;

  useLayoutEffect(() => {
    rememberListPath(pathname, search);
  }, [pathname, search]);

  const listPath = isSave ? getLastListPath() : pathname;
  const listSearch = isSave ? getLastListSearch() : search;
  const restoration = useScrollRestoration(`${listPath}${listSearch}`);

  return (
    <div className={styles.stage}>
      {showLibraryGrid ? (
        <div
          className={styles["keep-alive"]}
          data-suppressed={isSave || undefined}
          inert={isSave || undefined}
          aria-hidden={isSave || undefined}
        >
          <AppShell.Content>
            <Shell.Body className={styles.body}>
              {isSave ? null : <LibraryChrome />}
              <ScrollRestorationContext.Provider value={restoration}>
                <Shell.Main
                  ref={restoration.ref}
                  className={styles.main}
                  data-library-grid-viewport
                >
                  <LibraryView />
                </Shell.Main>
              </ScrollRestorationContext.Provider>
            </Shell.Body>
          </AppShell.Content>
        </div>
      ) : null}

      {isSave ? (
        <div className={styles.overlay}>
          <Outlet />
        </div>
      ) : isSources || isDownloads || isAssistant || isTags ? (
        <Outlet />
      ) : null}
    </div>
  );
}
