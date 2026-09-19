import { Shell } from "@pond/ui";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { LibraryChrome } from "@/features/library/components/chrome/chrome";
import { LibraryView } from "@/features/library/components/view/view";
import { AppShell } from "@/features/library/components/workspace-shell";
import {
  getLastListPath,
  getLastListSearch,
  rememberListPath,
} from "@/features/saves/lib/list-path";
import { saveIdFromPath } from "@/features/saves/lib/save-nav";
import {
  ScrollRestorationContext,
  useScrollRestoration,
} from "@/shared/hooks/use-scroll-restoration";
import styles from "./styles.module.css";

export function Library() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const isSave = saveIdFromPath(pathname) !== null;
  const isSources = pathname.startsWith("/sources");
  const isDownloads = pathname.startsWith("/downloads");
  const isAssistant = pathname === "/assistant";
  const isTags = pathname === "/tags";
  const isSettings = pathname.startsWith("/settings");
  const showLibraryGrid =
    !isSources && !isDownloads && !isAssistant && !isTags && !isSettings;

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
      ) : isSources || isDownloads || isAssistant || isTags || isSettings ? (
        <Outlet />
      ) : null}
    </div>
  );
}
