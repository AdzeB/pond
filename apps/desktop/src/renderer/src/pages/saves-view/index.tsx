import { ProcessingButton } from "@/components/capture/processing-button";
import { Library } from "@/components/library";
import { FilterBar } from "@/components/library/filter-bar";
import { Inspector } from "@/components/library/inspector";
import { LayoutSwitcher } from "@/components/library/layout-switcher";
import { HeaderToolbar } from "@/components/library/toolbar";
import { Shell } from "@/components/shell";
import { useCardActions } from "@/lib/use-card-actions";
import { type SavesMode, useSavesData } from "@/lib/use-saves-data";

interface SavesViewProps {
  mode?: SavesMode;
}

export function SavesView({ mode = "library" }: SavesViewProps) {
  const data = useSavesData(mode);
  const actions = useCardActions(data.filteredIds, mode, data.sourceFilter);

  return (
    <>
      <Shell.Main>
        <Shell.Toolbar>
          <HeaderToolbar.Root />
          <FilterBar.Root />
          <ProcessingButton.Root />
        </Shell.Toolbar>
        <Library.Root
          view={data.viewMode === "list" ? "list" : "grid"}
          onDragOver={actions.onDragOver}
          onDrop={(e) => void actions.onDrop(e)}
        >
          {data.filtered.length === 0 ? (
            !data.bootReady ? null : mode === "trash" ? (
              <Library.Empty>Trash is empty.</Library.Empty>
            ) : data.totalSaves === 0 ? (
              <Library.Empty>
                No saves yet. Drop a link, image, or file to get started.
              </Library.Empty>
            ) : (
              <Library.Empty>
                No matches. Try a different search or clear the filter.
              </Library.Empty>
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
        </Library.Root>
      </Shell.Main>
      <Inspector />
    </>
  );
}
