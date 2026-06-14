import { useMemo } from "react";
import { LibraryGridProvider } from "@/components/grid-context";
import { GridView } from "@/components/library-grid-view";
import { JustifiedView } from "@/components/library-justified";
import { ListView } from "@/components/library-list-view";
import { WaterfallView } from "@/components/library-waterfall";
import type { ViewMode } from "@/lib/library-types";
import type { Save } from "@/lib/types";

interface LayoutSwitcherProps {
  viewMode: ViewMode;
  saves: ReadonlyArray<Save>;
  selectedId: string | null;
  multiSelectActive: boolean;
  // Leading "saving N items" placeholder tile for in-flight saves (grid layouts only).
  placeholderCount: number;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
}

export function LayoutSwitcher(props: LayoutSwitcherProps) {
  const {
    viewMode,
    saves,
    selectedId,
    multiSelectActive,
    placeholderCount,
    onClick,
    onDoubleClick,
  } = props;

  const callbacks = useMemo(
    () => ({ onClick, onDoubleClick }),
    [onClick, onDoubleClick],
  );

  if (viewMode === "list") {
    return (
      <ListView
        saves={saves}
        selectedId={selectedId}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    );
  }

  return (
    <LibraryGridProvider
      callbacks={callbacks}
      multiSelectActive={multiSelectActive}
    >
      {viewMode === "justified" ? (
        <JustifiedView saves={saves} placeholderCount={placeholderCount} />
      ) : viewMode === "waterfall" ? (
        <WaterfallView saves={saves} placeholderCount={placeholderCount} />
      ) : (
        <GridView saves={saves} placeholderCount={placeholderCount} />
      )}
    </LibraryGridProvider>
  );
}
