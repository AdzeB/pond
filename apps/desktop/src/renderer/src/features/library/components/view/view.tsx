import { useCallback, useEffect } from "react";
import {
  LibraryEmpty,
  LibraryLoading,
  LibrarySectionEmpty,
  MatchesEmpty,
  TrashEmpty,
  UncategorizedEmpty,
} from "@/features/library/components/empty/empty";
import { HoverPreview } from "@/features/library/components/hover-preview/hover-preview";
import { LibraryGrid } from "@/features/library/components/layouts/grid/grid";
import { LayoutSwitcher } from "@/features/library/components/layouts/switcher/switcher";
import { useGridHotkeys } from "@/features/library/hooks/use-grid-hotkeys";
import { useLibraryState } from "@/features/library/hooks/use-library-state";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import { libraryViewContext } from "@/features/library/state/library-view-context";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { resetFilters } from "@/features/library/state/view-store";
import { useCardActions } from "@/features/saves/hooks/use-card-actions";
import { useSavePaging } from "@/features/saves/hooks/use-saves";
import {
  clearSaveSelection,
  isLibraryBackgroundTarget,
} from "@/features/saves/lib/select";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { buildEmptyGalleryMenu } from "./empty-gallery-menu";

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
      request: data.paging.queryRequest,
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
    data.paging.queryRequest,
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
          data.mode === "trash" &&
          !data.hasActiveSearch &&
          !data.hasActiveFilter ? (
            <TrashEmpty />
          ) : paging.total === 0 && data.mode !== "trash" ? (
            <LibraryEmpty />
          ) : data.hasActiveSearch || data.hasActiveFilter ? (
            <MatchesEmpty onReset={resetFilters} />
          ) : data.mode !== "library" && data.mode !== "trash" ? (
            <LibrarySectionEmpty mode={data.mode} />
          ) : nav.kind === "uncategorized" ? (
            <UncategorizedEmpty />
          ) : (
            <MatchesEmpty onReset={resetFilters} />
          )
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
