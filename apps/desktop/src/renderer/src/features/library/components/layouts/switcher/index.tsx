import { useMemo } from "react";
import { GridView } from "@/features/library/components/layouts/grid-view";
import { JustifiedView } from "@/features/library/components/layouts/justified";
import { ListView } from "@/features/library/components/layouts/list-view";
import { WaterfallView } from "@/features/library/components/layouts/waterfall";
import type { ViewMode } from "@/features/library/types";
import { LibraryGridProvider } from "@/features/saves";
import type { Save } from "@/features/saves/types";

interface LayoutSwitcherProps {
  viewMode: ViewMode;
  saves: ReadonlyArray<Save>;
  multiSelectActive: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onAuxClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
  onEndReached?: () => void;
}

export function LayoutSwitcher(props: LayoutSwitcherProps) {
  const {
    viewMode,
    saves,
    multiSelectActive,
    onClick,
    onAuxClick,
    onDoubleClick,
    onEndReached,
  } = props;

  const callbacks = useMemo(
    () => ({ onClick, onAuxClick, onDoubleClick }),
    [onClick, onAuxClick, onDoubleClick],
  );

  return (
    <LibraryGridProvider
      callbacks={callbacks}
      multiSelectActive={multiSelectActive}
    >
      {viewMode === "justified" ? (
        <JustifiedView saves={saves} onEndReached={onEndReached} />
      ) : viewMode === "waterfall" ? (
        <WaterfallView saves={saves} onEndReached={onEndReached} />
      ) : viewMode === "list" ? (
        <ListView saves={saves} onEndReached={onEndReached} />
      ) : (
        <GridView saves={saves} onEndReached={onEndReached} />
      )}
    </LibraryGridProvider>
  );
}
