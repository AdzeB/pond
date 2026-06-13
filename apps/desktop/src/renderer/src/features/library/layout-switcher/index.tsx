import { useMemo } from "react";
import type { Save } from "@/core/data/types";
import { LibraryGridProvider } from "@/features/library/grid-context";
import { GridView } from "@/features/library/grid-view";
import { JustifiedView } from "@/features/library/justified";
import type { ViewMode } from "@/features/library/types";
import { WaterfallView } from "@/features/library/waterfall";
import { ListView } from "./list-view";

interface LayoutSwitcherProps {
  viewMode: ViewMode;
  saves: ReadonlyArray<Save>;
  selectedId: string | null;
  multiSelectActive: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
}

export function LayoutSwitcher(props: LayoutSwitcherProps) {
  const {
    viewMode,
    saves,
    selectedId,
    multiSelectActive,
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
        <JustifiedView saves={saves} />
      ) : viewMode === "waterfall" ? (
        <WaterfallView saves={saves} />
      ) : (
        <GridView saves={saves} />
      )}
    </LibraryGridProvider>
  );
}
