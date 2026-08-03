export interface PackedItem {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PackResult {
  items: PackedItem[];
  totalHeight: number;
}

/** Matches the library save packers so sources/analytics share the same column rhythm. */
export const LIBRARY_ITEM_GAP = 16;

/** Uniform cells packed manually so they ride the PackedGrid windowing path. */
export function packUniform(
  ids: ReadonlyArray<string>,
  containerWidth: number,
  colMin: number,
  gap: number,
  cellHeight: number | ((colW: number) => number),
): PackResult {
  if (containerWidth <= 0 || ids.length === 0) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const cellH =
    typeof cellHeight === "function" ? cellHeight(colW) : cellHeight;
  const place = (idx: number) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      width: colW,
      /** `height` feeds viewport windowing, so it spans the whole cell. */
      height: cellH,
      top: row * (cellH + gap),
      left: col * (colW + gap),
    };
  };
  const items: PackedItem[] = ids.map((id, idx) => ({ id, ...place(idx) }));
  const rows = Math.ceil(ids.length / cols);
  const totalHeight = rows > 0 ? rows * cellH + (rows - 1) * gap : 0;
  return { items, totalHeight };
}
