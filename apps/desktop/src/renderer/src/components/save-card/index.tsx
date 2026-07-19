import { motion } from "motion/react";
import { memo, useCallback, useMemo } from "react";
import { useLibraryCardCallbacks } from "@/components/grid-context";
import { type CardLayout, CardThumb } from "@/components/save-card-media";
import { Card } from "@/components/save-card-parts";
import { SaveContextMenu } from "@/components/save-context-menu";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useSave } from "@/hooks/use-saves";
import { pickPrimaryFile } from "@/lib/media/units";
import type { Save } from "@/lib/types";
import { gentleSpring } from "@/lib/ui/motion";
import { formatAbsolute } from "@/lib/util/format";
import { clampRatio } from "@/stores/aspect";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { usePrefs } from "@/stores/prefs";
import { selection, useIsPrimary, useIsSelected } from "@/stores/selection";

/** FLIP-capable card root: repacks (sort, filter, zoom, ask results) glide instead of teleporting. */
const MotionCardRoot = motion.create(Card.Root);

const ENTER_INITIAL = { opacity: 0, y: 12, scale: 0.96 };
const ENTER_ANIMATE = { opacity: 1, y: 0, scale: 1 };

interface SaveCardProps {
  id: string;
  layout: CardLayout;
  packedWidth?: number;
  packedHeight?: number;
  packedTop?: number;
  packedLeft?: number;
  /** True only for saves that joined the list after first paint, so scroll-in mounts stay quiet. */
  entering?: boolean;
}

export const SaveCard = memo(function SaveCard({
  id,
  layout,
  packedWidth,
  packedHeight,
  packedTop,
  packedLeft,
  entering,
}: SaveCardProps) {
  /** Callbacks come from grid context so this memoized card doesn't re-render on a sibling's selection change. */
  const { onClick, onDoubleClick } = useLibraryCardCallbacks();
  /** Per-id subscription: edits to this save wake only this card. */
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
      <MotionCardRoot
        selected={isPrimary}
        multi={isMulti}
        style={liStyle}
        draggable={save.files.length > 0}
        onNativeDragStart={onDragStart}
        layout="position"
        initial={entering ? ENTER_INITIAL : false}
        animate={entering ? ENTER_ANIMATE : undefined}
        transition={gentleSpring}
      >
        <Card.Checkbox
          checked={isMulti}
          aria-label={isMulti ? "Deselect" : "Select"}
          onClick={onCheckboxClick}
        />
        <Card.Select
          aria-pressed={isPrimary}
          onClick={onSelectClick}
          onDoubleClick={onSelectDoubleClick}
        >
          <SaveCardBody save={save} layout={layout} />
        </Card.Select>
      </MotionCardRoot>
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
  /** Clamp so panoramas and extreme portraits don't distort justified rows or waterfall cards. */
  const ratio = w && h ? clampRatio(w, h) : 1;
  const mediaStyle = useMemo<React.CSSProperties>(
    () =>
      ({
        "--card-aspect": w && h ? `${w} / ${h}` : "1 / 1",
        "--card-aspect-num": String(ratio),
      }) as React.CSSProperties,
    [w, h, ratio],
  );
  const prefs = useDisplayPrefs();
  const dateLabel = useMemo(() => formatAbsolute(save.savedAt), [save.savedAt]);
  return (
    <>
      <Card.Media style={mediaStyle}>
        <CardThumb save={save} layout={layout} />
        <Card.Overlay save={save} primary={primary} />
      </Card.Media>
      <Card.Meta
        title={prefs.name ? (save.title ?? save.url) : undefined}
        time={prefs.date ? dateLabel : undefined}
      />
    </>
  );
});
