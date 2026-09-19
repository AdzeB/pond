import { Sidebar } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { NewMenu } from "@/features/library/components/new-menu";
import { SmartFoldersSection } from "@/features/library/components/smart-folders";
import { WorkspaceMenu } from "@/features/library/components/workspace-menu";
import { useFolders } from "@/features/library/state/folders";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import { useHydrateSavedViews } from "@/features/library/state/saved-views";
import { useViewStore } from "@/features/library/state/view-store";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { FolderTree } from "./folder-tree";
import { LibraryDestinations } from "./library-destinations";
import { selectLibraryNav } from "./navigation";
import styles from "./styles.module.css";

function WorkspaceHeader() {
  return (
    <Sidebar.Header className={styles.workspace}>
      <WorkspaceMenu />
      <div className={styles["workspace-actions"]}>
        <NewMenu />
      </div>
    </Sidebar.Header>
  );
}

export function FolderSidebar() {
  const nav = useLibraryNav();
  const { activeViewId } = useViewStore();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const folderRows = useFolders();
  const scrollFade = useScrollFade<HTMLDivElement>();
  const libraryPage = ![
    "/assistant",
    "/sources",
    "/tags",
    "/untagged",
  ].includes(pathname);
  useHydrateSavedViews();

  return (
    <Sidebar.Root
      className={styles.root}
      width="full"
      role="navigation"
      aria-label="Library"
    >
      <WorkspaceHeader />
      <Sidebar.Scroll className={styles.scroll} {...scrollFade}>
        <LibraryDestinations
          activeViewId={activeViewId}
          nav={nav}
          pathname={pathname}
        />
        <SmartFoldersSection
          active={pathname === "/" && nav.kind === "all"}
          onSelect={() => selectLibraryNav({ kind: "all" })}
        />
        <FolderTree
          folderRows={folderRows}
          libraryPage={libraryPage}
          nav={nav}
        />
      </Sidebar.Scroll>
    </Sidebar.Root>
  );
}
