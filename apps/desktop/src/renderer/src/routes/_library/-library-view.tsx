import { Navigate } from "@tanstack/react-router";
import { ProcessingButton } from "@/components/capture/processing-button";
import { LibraryGrid } from "@/components/library";
import { FilterBar } from "@/components/library/filter-bar";
import { LayoutSwitcher } from "@/components/library/layout-switcher";
import { HeaderToolbar } from "@/components/library/toolbar";
import { Shell } from "@/components/shell";
import { useCardActions } from "@/lib/use-card-actions";
import { useLibraryState } from "@/lib/use-library-state";

export function LibraryView() {
  const data = useLibraryState();
  const actions = useCardActions(
    data.filteredIds,
    data.mode,
    data.sourceFilter,
  );

  if (data.unknown) return <Navigate to="/" replace />;

  return (
    <Shell.Main>
      <Shell.Header>
        <HeaderToolbar />
        <FilterBar.Root />
        <ProcessingButton />
      </Shell.Header>
      <LibraryGrid.Root
        view={data.viewMode === "list" ? "list" : "grid"}
        onDragOver={actions.onDragOver}
        onDrop={(e) => void actions.onDrop(e)}
      >
        {data.filtered.length === 0 ? (
          !data.bootReady ? null : data.mode === "trash" ? (
            <LibraryGrid.Empty>Trash is empty.</LibraryGrid.Empty>
          ) : data.totalSaves === 0 ? (
            <LibraryGrid.Empty>
              No saves yet. Drop a link, image, or file to get started.
            </LibraryGrid.Empty>
          ) : (
            <LibraryGrid.Empty>
              No matches. Try a different search or clear the filter.
            </LibraryGrid.Empty>
          )
        ) : (
          <LayoutSwitcher
            viewMode={data.viewMode}
            saves={data.filtered}
            selectedId={data.selectedId}
            multiSelectActive={actions.multiSelectActive}
            onClick={actions.handleCardClick}
            onDoubleClick={actions.focus}
          />
        )}
      </LibraryGrid.Root>
    </Shell.Main>
  );
}
