import { NotebookPen } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { Card, type CardLayout } from "@/components/_primitives/card-thumb";
import { LibraryGrid } from "@/components/library";
import { SaveContextMenu } from "@/components/save/context-menu";
import { useDisplayPrefs } from "@/lib/display-prefs";
import { useSave } from "@/pool/hooks";
import { buildMediaUnits, pickPrimaryFile } from "@/pool/media";
import { selection, useIsPrimary, useIsSelected } from "@/pool/selection";
import { useResolvedTheme } from "@/pool/theme";
import type { Save } from "@/pool/types";

interface SaveCardProps {
  id: string;
  layout: CardLayout;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
  packedWidth?: number;
  packedHeight?: number;
  packedTop?: number;
  packedLeft?: number;
}

export const SaveCard = memo(function SaveCard({
  id,
  layout,
  onClick,
  onDoubleClick,
  packedWidth,
  packedHeight,
  packedTop,
  packedLeft,
}: SaveCardProps) {
  // Per-id subscription: title / status / files edits to *this* save
  // wake only this card via notifyId; the parent grid keeps a stable
  // snapshot from useSaves() and never re-renders for field changes.
  const save = useSave(id);
  const isMulti = useIsSelected(id);
  const isPrimary = useIsPrimary(id);

  const liStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (packedWidth == null || packedHeight == null) return undefined;
    const base: React.CSSProperties = {
      width: `${packedWidth}px`,
      ["--packed-h" as never]: `${packedHeight}px`,
    };
    if (packedTop != null && packedLeft != null) {
      base.position = "absolute";
      base.top = `${packedTop}px`;
      base.left = `${packedLeft}px`;
    }
    return base;
  }, [packedWidth, packedHeight, packedTop, packedLeft]);

  const files = save?.files;
  const coverIndex = save?.coverIndex;
  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!files || files.length === 0) return;
      e.preventDefault();
      void window.pond.query("saves.startDrag", {
        id,
        fileIndex: coverIndex ?? 0,
      });
    },
    [id, files, coverIndex],
  );

  const onCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selection.toggle(id);
      if (selection.has(id)) selection.setAnchor(id);
    },
    [id],
  );

  const onSelectClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => onClick(id, e),
    [onClick, id],
  );
  const onSelectDoubleClick = useCallback(
    () => onDoubleClick(id),
    [onDoubleClick, id],
  );

  if (!save) return null;

  return (
    <SaveContextMenu save={save}>
      <LibraryGrid.Item
        selected={isPrimary}
        multi={isMulti}
        style={liStyle}
        draggable={save.files.length > 0}
        onDragStart={onDragStart}
      >
        <LibraryGrid.Item.Checkbox
          checked={isMulti}
          aria-label={isMulti ? "Deselect" : "Select"}
          onClick={onCheckboxClick}
        />
        <LibraryGrid.Item.Select
          aria-pressed={isPrimary}
          onClick={onSelectClick}
          onDoubleClick={onSelectDoubleClick}
        >
          <SaveCardBody save={save} layout={layout} />
        </LibraryGrid.Item.Select>
      </LibraryGrid.Item>
    </SaveContextMenu>
  );
});

const SaveCardBody = memo(function SaveCardBody({
  save,
  layout,
}: {
  save: Save;
  layout?: CardLayout;
}) {
  const theme = useResolvedTheme();
  const primary = pickPrimaryFile(save, { theme });
  const w = primary?.width ?? save.width ?? null;
  const h = primary?.height ?? save.height ?? null;
  // Clamp to a sane range so panoramas / extreme portraits don't stretch
  // a justified row into a single tile or shrink a waterfall card.
  const ratio = w && h ? Math.min(2.5, Math.max(0.4, w / h)) : 1;
  const mediaStyle = useMemo<React.CSSProperties>(
    () =>
      ({
        "--card-aspect": w && h ? `${w} / ${h}` : "1 / 1",
        "--card-aspect-num": String(ratio),
      }) as React.CSSProperties,
    [w, h, ratio],
  );
  const prefs = useDisplayPrefs();
  const showMeta = prefs.name || prefs.date;
  // Carousel count = displayable media units only. Avatars are author
  // metadata, and posters are paired with their video, so neither should
  // pad the badge.
  const mediaUnitCount = useMemo(() => buildMediaUnits(save).length, [save]);
  return (
    <>
      <LibraryGrid.Item.Media style={mediaStyle}>
        <Card.Root save={save} layout={layout}>
          <Card.Media />
          <Card.DownloadingBadge />
        </Card.Root>
        {prefs.fileCount && mediaUnitCount > 1 ? (
          <LibraryGrid.Item.Count aria-label={`${mediaUnitCount} media files`}>
            {mediaUnitCount}
          </LibraryGrid.Item.Count>
        ) : null}
        {save.notes?.trim() ? (
          <LibraryGrid.Item.Note aria-label="Has a note" title="Has a note">
            <NotebookPen size={11} />
          </LibraryGrid.Item.Note>
        ) : null}
      </LibraryGrid.Item.Media>
      {showMeta ? (
        <LibraryGrid.Item.Meta>
          {prefs.name ? (
            <LibraryGrid.Item.Title>
              {save.title ?? save.url}
            </LibraryGrid.Item.Title>
          ) : null}
          {prefs.date ? (
            <LibraryGrid.Item.Time>
              {formatAbsolute(save.savedAt)}
            </LibraryGrid.Item.Time>
          ) : null}
        </LibraryGrid.Item.Meta>
      ) : null}
    </>
  );
});

export function formatAbsolute(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}
