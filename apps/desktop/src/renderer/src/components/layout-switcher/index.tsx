import { useMemo } from "react";
import { LibraryGridProvider } from "@/components/grid-context";
import { GridView } from "@/components/library-grid-view";
import { JustifiedView } from "@/components/library-justified";
import { WaterfallView } from "@/components/library-waterfall";
import type { Save, ViewMode } from "@/lib/types";

interface LayoutSwitcherProps {
  viewMode: ViewMode;
  saves: ReadonlyArray<Save>;
  multiSelectActive: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onAuxClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
}

export function LayoutSwitcher(props: LayoutSwitcherProps) {
  const {
    viewMode,
    saves,
    multiSelectActive,
    onClick,
    onAuxClick,
    onDoubleClick,
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
        <JustifiedView saves={saves} />
      ) : viewMode === "waterfall" ? (
        <WaterfallView saves={saves} />
      ) : (
        <GridView saves={saves} />
      )}
    </LibraryGridProvider>
  );
}
