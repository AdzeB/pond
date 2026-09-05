import { useMemo } from "react";
import { SavePackedGrid } from "@/components/library/layouts/packed-grid";
import { packList } from "@/components/library/layouts/packing";
import type { Save } from "@/lib/types";
import { useGridWidth } from "@/stores/shell-state";

const ROW = 64;
const PREVIEW = 48;

interface ListViewProps {
  saves: ReadonlyArray<Save>;
  onEndReached?: () => void;
}

export function ListView({ saves, onEndReached }: ListViewProps) {
  const width = useGridWidth();
  const { items, totalHeight } = useMemo(
    () =>
      packList(
        saves.map((save) => save.id),
        width,
        ROW,
        PREVIEW,
      ),
    [saves, width],
  );

  return (
    <SavePackedGrid
      layout="list"
      items={items}
      totalHeight={totalHeight}
      onEndReached={onEndReached}
    />
  );
}
