import { useCallback, useEffect } from "react";
import {
  FolderEmpty,
  LibraryEmpty,
  LibraryLoading,
  LibrarySectionEmpty,
  MatchesEmpty,
  TrashEmpty,
  UncategorizedEmpty,
} from "@/features/library/components/empty";
import { libraryEmptyKind } from "@/features/library/components/empty/kind";
import { HoverPreview } from "@/features/library/components/hover-preview";
import { LibraryGrid } from "@/features/library/components/layouts/grid";
import { LayoutSwitcher } from "@/features/library/components/layouts/switcher/switcher";
import { useGridHotkeys } from "@/features/library/hooks/use-grid-hotkeys";
import { useLibraryState } from "@/features/library/hooks/use-library-state";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import { resetFilters } from "@/features/library/state/view-store";
import { useCardActions } from "@/features/saves/hooks/use-card-actions";
import { useSavePaging } from "@/features/saves/hooks/use-saves";
import {
  clearSaveSelection,
  isLibraryBackgroundTarget,
} from "@/features/saves/lib/select";
import { resultNavigation } from "@/features/saves/state/result-navigation";
import { libraryViewContext } from "@/features/saves/state/view-context";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { buildEmptyGalleryMenu } from "./empty-gallery-menu";

function LibraryEmptyState({
  mode,
  navKind,
  hasActiveSearch,
  hasActiveFilter,
  libraryTotal,
}: {
  mode: ReturnType<typeof useLibraryState>["mode"];
  navKind: ReturnType<typeof useLibraryNav>["kind"];
  hasActiveSearch: boolean;
  hasActiveFilter: boolean;
  libraryTotal: number;
}) {
  const kind = libraryEmptyKind({
    mode,
    navKind,
    hasActiveSearch,
    hasActiveFilter,
    libraryTotal,
  });
  if (kind === "trash") return <TrashEmpty />;
  if (kind === "folder") return <FolderEmpty />;
  if (kind === "library") return <LibraryEmpty />;
  if (kind === "uncategorized") return <UncategorizedEmpty />;
  if (kind === "section" && mode !== "library" && mode !== "trash") {
    return <LibrarySectionEmpty mode={mode} />;
  }
  return <MatchesEmpty onReset={resetFilters} />;
}

export function LibraryView() {
  const data = useLibraryState();
  const nav = useLibraryNav();
  const paging = useSavePaging();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );
  useGridHotkeys(data.filteredIds, data.paging.allIds);

  const canLoadAnotherPage = data.paging.hasMore && !data.paging.loading;
  const onEndReached = useCallback(() => {
    void data.paging.loadMore();
  }, [data.paging.loadMore]);

  useEffect(() => {
    libraryViewContext.set(data.filteredIds, data.mode);
    resultNavigation.setSource({
      key: data.paging.queryKey,
      loadedIds: data.paging.loadedIds,
      ids: data.filteredIds,
      allIds: data.paging.allIds,
      loadMore: data.paging.loadMore,
    });
  }, [
    data.filteredIds,
    data.mode,
    data.paging.allIds,
    data.paging.loadMore,
    data.paging.queryKey,
    data.paging.loadedIds,
  ]);

  return (
    <SpecContextMenu
      search
      searchLabel="Search operations"
      onOpen={(eventDetails) => {
        if (!isLibraryBackgroundTarget(eventDetails.event?.target ?? null)) {
          eventDetails.cancel();
        }
      }}
      buildItems={buildEmptyGalleryMenu}
    >
      <LibraryGrid.Root
        data-library-grid=""
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          if (!isLibraryBackgroundTarget(event.target)) return;
          clearSaveSelection();
        }}
        onDragOver={actions.onDragOver}
        onDrop={(e) => void actions.onDrop(e)}
      >
        {data.paging.error ? (
          <div role="alert">
            {data.paging.error}{" "}
            <button type="button" onClick={() => void data.paging.retry()}>
              Try again
            </button>
          </div>
        ) : !data.bootReady ||
          (data.paging.loading && data.filtered.length === 0) ? (
          <LibraryLoading />
        ) : data.filtered.length === 0 ? (
          <LibraryEmptyState
            mode={data.mode}
            navKind={nav.kind}
            hasActiveSearch={data.hasActiveSearch}
            hasActiveFilter={data.hasActiveFilter}
            libraryTotal={paging.total}
          />
        ) : (
          <LayoutSwitcher
            viewMode={data.viewMode}
            saves={data.filtered}
            multiSelectActive={actions.multiSelectActive}
            onClick={actions.handleCardClick}
            onAuxClick={actions.handleCardAuxClick}
            onDoubleClick={actions.focus}
            onEndReached={canLoadAnotherPage ? onEndReached : undefined}
          />
        )}
        <HoverPreview />
      </LibraryGrid.Root>
    </SpecContextMenu>
  );
}
