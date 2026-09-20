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
import { usePrefs } from "@/features/settings/state/prefs";
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
  const [sidebar] = usePrefs("sidebar");
  const destinations = sidebar.destinations;
  const count = (value: number) => (sidebar.showCounts ? value : undefined);
  const assistantPage = pathname === "/assistant";
  const sourcesPage = pathname === "/sources";
  const tagsPage = pathname === "/tags";
  const untaggedPage = pathname === "/untagged";
  const libraryPage =
    !assistantPage && !sourcesPage && !tagsPage && !untaggedPage;
  const downloadsCount = inProgress.saving.length + inProgress.running.length;

  return (
    <>
      {Object.values(destinations).slice(0, 5).some(Boolean) ? (
        <Sidebar.Group>
          <Sidebar.GroupLabel>Library</Sidebar.GroupLabel>
          {destinations.all ? (
            <Row
              label="All"
              icon={<IconAlbum2Outline18 />}
              count={count(counts.library)}
              active={libraryPage && nav.kind === "all" && !activeViewId}
              onClick={() => {
                resetFilters();
                selectLibraryNav({ kind: "all" });
              }}
            />
          ) : null}
          {destinations.uncategorized ? (
            <Row
              label="Uncategorized"
              icon={<IconFolderBanOutline18 />}
              count={count(counts.uncategorized)}
              active={libraryPage && nav.kind === "uncategorized"}
              onClick={() => {
                resetFilters();
                selectLibraryNav({ kind: "uncategorized" });
              }}
            />
          ) : null}
          {destinations.untagged ? (
            <Row
              label="Untagged"
              icon={<IconBookmarkSlashOutline18 />}
              count={count(counts.untagged)}
              active={untaggedPage}
              onClick={() => {
                resetFilters();
                selectLibraryNav({ kind: "all" });
                goToLibraryPath("/untagged");
              }}
            />
          ) : null}
          {destinations.tags ? (
            <Row
              label="Tags"
              icon={<IconBookmarkOutline18 />}
              count={count(tags.length)}
              active={tagsPage}
              onClick={() => goToLibraryPath("/tags")}
            />
          ) : null}
          {destinations.trash ? (
            <SpecContextMenu
              buildItems={() => buildTrashMenuItems(counts.trash > 0)}
            >
              <Row
                label="Trash"
                icon={<IconTrashXmarkOutline18 />}
                count={count(counts.trash)}
                active={libraryPage && nav.kind === "trash"}
                onClick={() => selectLibraryNav({ kind: "trash" })}
              />
            </SpecContextMenu>
          ) : null}
        </Sidebar.Group>
      ) : null}
      {destinations.downloads || destinations.sources ? (
        <Sidebar.Group>
          <Sidebar.GroupLabel>Harvesting</Sidebar.GroupLabel>
          {destinations.downloads ? (
            <Row
              label="Downloads"
              icon={<IconWindowDownloadOutline18 />}
              count={count(downloadsCount)}
              active={libraryPage && nav.kind === "downloads"}
              onClick={() => selectLibraryNav({ kind: "downloads" })}
            />
          ) : null}
          {destinations.sources ? (
            <Row
              label="Sources"
              icon={<IconArrowDiagonalInOutline18 />}
              count={count(accounts.length)}
              active={sourcesPage}
              onClick={() => selectLibraryNav({ kind: "sources" })}
            />
          ) : null}
        </Sidebar.Group>
      ) : null}
    </>
  );
}
