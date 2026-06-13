import { IconNotepadOutline18 as NotebookPen } from "@pond/icons/outline/18";
import { memo, useCallback, useMemo } from "react";
import { useSave } from "@/core/data/hooks";
import { buildMediaUnits, pickPrimaryFile } from "@/core/data/media";
import { usePrefs } from "@/core/data/prefs";
import { selection, useIsPrimary, useIsSelected } from "@/core/data/selection";
import { useResolvedTheme } from "@/core/data/theme";
import type { Save, SaveFile } from "@/core/data/types";
import { formatAbsolute } from "@/core/lib/format";
import { type CardLayout, CardThumb } from "@/features/library/card-thumb";
import { LibraryGrid } from "@/features/library/grid";
import { useLibraryCardCallbacks } from "@/features/library/grid-context";
import { useDisplayPrefs } from "@/features/library/stores/display-prefs";
import { SaveContextMenu } from "@/features/save/menus/save-context";
import { getSourceIcon } from "@/features/sources/registry";
import { getSourceLabel } from "@/features/sources/source-labels";

// Short, badge-friendly label for the save's primary asset. Prefers the
// file extension (PNG, MP4, GIF…), then its mime subtype, then the
// coarse mediaType, falling back to "Link" for URL-only saves.
function deriveTypeLabel(file: SaveFile | null, save: Save): string | null {
  const ext = file?.path.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{1,4}$/.test(ext)) return ext.toUpperCase();
  const subtype = file?.mimeType?.split("/")[1]?.split(";")[0];
  if (subtype) return subtype.toUpperCase();
  const media = save.mediaType?.toLowerCase();
  if (media === "video") return "Video";
  if (media === "image") return "Image";
  if (media === "link") return "Link";
  if (save.mediaType) return save.mediaType.toUpperCase();
  return save.url ? "Link" : null;
}

interface SaveCardProps {
  id: string;
  layout: CardLayout;
  packedWidth?: number;
  packedHeight?: number;
  packedTop?: number;
  packedLeft?: number;
}

export const SaveCard = memo(function SaveCard({
  id,
  layout,
  packedWidth,
  packedHeight,
  packedTop,
  packedLeft,
}: SaveCardProps) {
  // Interaction callbacks come from the grid context so this memoized
  // card never re-renders just because a sibling's selection changed.
  const { onClick, onDoubleClick } = useLibraryCardCallbacks();
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
  const [preferences] = usePrefs("preferences");
  const tweetCover = preferences?.tweetCover;
  const primary = useMemo(
    () => pickPrimaryFile(save, { theme, tweetCover }),
    [save, theme, tweetCover],
  );
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
  const typeLabel = useMemo(
    () => (prefs.type ? deriveTypeLabel(primary, save) : null),
    [prefs.type, primary, save],
  );
  const sourceLabel = prefs.source ? getSourceLabel(save.source) : null;
  const SourceIcon = prefs.source ? getSourceIcon(save.source) : null;
  const showMeta = prefs.name || prefs.date;
  const dateLabel = useMemo(() => formatAbsolute(save.savedAt), [save.savedAt]);
  // Carousel count = displayable media units only. Avatars are author
  // metadata, and posters are paired with their video, so neither should
  // pad the badge.
  const mediaUnitCount = useMemo(() => buildMediaUnits(save).length, [save]);
  return (
    <>
      <LibraryGrid.Item.Media style={mediaStyle}>
        <CardThumb save={save} layout={layout} />
        {typeLabel ? (
          <LibraryGrid.Item.Type aria-label={`Type: ${typeLabel}`}>
            {typeLabel}
          </LibraryGrid.Item.Type>
        ) : null}
        {sourceLabel ? (
          <LibraryGrid.Item.Source
            aria-label={`Saved from ${sourceLabel}`}
            title={`Saved from ${sourceLabel}`}
          >
            {SourceIcon ? <SourceIcon width={11} height={11} /> : sourceLabel}
          </LibraryGrid.Item.Source>
        ) : null}
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
            <LibraryGrid.Item.Time>{dateLabel}</LibraryGrid.Item.Time>
          ) : null}
        </LibraryGrid.Item.Meta>
      ) : null}
    </>
  );
});
