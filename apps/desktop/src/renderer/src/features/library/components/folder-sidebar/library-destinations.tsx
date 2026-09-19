import {
  IconAlbum2Outline18,
  IconArrowDiagonalInOutline18,
  IconBookmarkOutline18,
  IconBookmarkSlashOutline18,
  IconFolderBanOutline18,
  IconTrashXmarkOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import { Sidebar } from "@pond/ui";
import { useStatusFeed } from "@/features/downloads/lib/status-feed";
import { useSidebarCounts } from "@/features/library/hooks/use-sidebar-counts";
import type { LibraryNav } from "@/features/library/state/library-chrome";
import { resetFilters } from "@/features/library/state/view-store";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useTags } from "@/features/tags/state/tags";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { goToLibraryPath, selectLibraryNav } from "./navigation";
import { Row } from "./row";
import { buildTrashMenuItems } from "./trash-menu";

interface LibraryDestinationsProps {
  activeViewId: string | null;
  nav: LibraryNav;
  pathname: string;
}

export function LibraryDestinations({
  activeViewId,
  nav,
  pathname,
}: LibraryDestinationsProps) {
  const tags = useTags();
  const { accounts } = useAccounts();
  const { inProgress } = useStatusFeed();
  const counts = useSidebarCounts();
  const assistantPage = pathname === "/assistant";
  const sourcesPage = pathname === "/sources";
  const tagsPage = pathname === "/tags";
  const untaggedPage = pathname === "/untagged";
  const libraryPage =
    !assistantPage && !sourcesPage && !tagsPage && !untaggedPage;
  const downloadsCount = inProgress.saving.length + inProgress.running.length;

  return (
    <>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Library</Sidebar.GroupLabel>
        <Row
          label="All"
          icon={<IconAlbum2Outline18 />}
          count={counts.library}
          active={libraryPage && nav.kind === "all" && !activeViewId}
          onClick={() => {
            resetFilters();
            selectLibraryNav({ kind: "all" });
          }}
        />
        <Row
          label="Uncategorized"
          icon={<IconFolderBanOutline18 />}
          count={counts.uncategorized}
          active={libraryPage && nav.kind === "uncategorized"}
          onClick={() => {
            resetFilters();
            selectLibraryNav({ kind: "uncategorized" });
          }}
        />
        <Row
          label="Untagged"
          icon={<IconBookmarkSlashOutline18 />}
          count={counts.untagged}
          active={untaggedPage}
          onClick={() => {
            resetFilters();
            selectLibraryNav({ kind: "all" });
            goToLibraryPath("/untagged");
          }}
        />
        <Row
          label="Tags"
          icon={<IconBookmarkOutline18 />}
          count={tags.length}
          active={tagsPage}
          onClick={() => goToLibraryPath("/tags")}
        />
        <SpecContextMenu buildItems={buildTrashMenuItems}>
          <Row
            label="Trash"
            icon={<IconTrashXmarkOutline18 />}
            count={counts.trash}
            active={libraryPage && nav.kind === "trash"}
            onClick={() => selectLibraryNav({ kind: "trash" })}
          />
        </SpecContextMenu>
      </Sidebar.Group>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Harvesting</Sidebar.GroupLabel>
        <Row
          label="Downloads"
          icon={<IconWindowDownloadOutline18 />}
          count={downloadsCount}
          active={libraryPage && nav.kind === "downloads"}
          onClick={() => selectLibraryNav({ kind: "downloads" })}
        />
        <Row
          label="Sources"
          icon={<IconArrowDiagonalInOutline18 />}
          count={accounts.length}
          active={sourcesPage}
          onClick={() => selectLibraryNav({ kind: "sources" })}
        />
      </Sidebar.Group>
    </>
  );
}
