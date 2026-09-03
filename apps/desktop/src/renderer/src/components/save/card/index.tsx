import { motion } from "motion/react";
import { memo, useCallback, useMemo } from "react";
import { type CardLayout, CardThumb } from "@/components/save/card/media";
import { Card } from "@/components/save/card/parts";
import { SaveContextMenu } from "@/components/save/context-menu";
import { useLibraryCardCallbacks } from "@/components/shared/grid-context";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import { useSave } from "@/hooks/use-saves";
import { pickCardUnit, pickPrimaryFile } from "@/lib/media/units";
import { resolveFileIndex } from "@/lib/save/actions";
import { startNativeDrag } from "@/lib/save/start-drag";
import type { Save } from "@/lib/types";
import { formatAbsolute } from "@/lib/util/format";
import { aspectDimsFor, clampRatio } from "@/stores/aspect";
import { useDisplayPref } from "@/stores/display-prefs";
import { useIsAnchor, useIsPrimary, useIsSelected } from "@/stores/selection";
import { useIsTumbling } from "@/stores/trash-tumble";

interface PackedCardStyle extends React.CSSProperties {
  "--packed-h": string;
}

interface MediaAspectStyle extends React.CSSProperties {
  "--card-aspect"?: string;
  "--card-aspect-num"?: string;
}

const MotionCardRoot = motion.create(Card.Root);

const TUMBLE_TRANSITION = {
  duration: 0.34,
  ease: [0.5, 0, 0.85, 0.4] as const,
};

function tumbleTarget(id: string) {
  const lean = (id.charCodeAt(id.length - 1) ?? 0) % 2 === 0 ? 1 : -1;
  return { opacity: 0, y: 120, scale: 0.55, rotate: 8 * lean };
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
  const { onClick, onAuxClick, onDoubleClick } = useLibraryCardCallbacks();
  const save = useSave(id);
  const isMulti = useIsSelected(id);
  const isPrimary = useIsPrimary(id);
  const isAnchor = useIsAnchor(id);
  const tumbling = useIsTumbling(id);

  const liStyle = useMemo<PackedCardStyle | undefined>(() => {
    if (packedWidth == null || packedHeight == null) return undefined;
    const base: PackedCardStyle = {
      width: `${packedWidth}px`,
      "--packed-h": `${packedHeight}px`,
    };
    if (packedTop != null && packedLeft != null) {
      base.position = "absolute";
      base.top = 0;
      base.left = 0;
      base.transform = `translate3d(${packedLeft}px, ${packedTop}px, 0)`;
    }
    return base;
  }, [packedWidth, packedHeight, packedTop, packedLeft]);

  const dragFileIndex = save ? resolveFileIndex(save) : null;
  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      if (dragFileIndex == null) return;
      e.preventDefault();
      startNativeDrag(id);
    },
    [id, dragFileIndex],
  );

  const onSelectClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => onClick(id, e),
    [onClick, id],
  );
  const onSelectAuxClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => onAuxClick(id, e),
    [onAuxClick, id],
  );
  const onSelectDoubleClick = useCallback(
    () => onDoubleClick(id),
    [onDoubleClick, id],
  );

  if (!save) return null;

  const children = (
    <Card.Select
      aria-pressed={isMulti || isPrimary}
      onClick={onSelectClick}
      onAuxClick={onSelectAuxClick}
      onDoubleClick={onSelectDoubleClick}
    >
      <SaveCardBody save={save} layout={layout} width={packedWidth} />
    </Card.Select>
  );

  const rootProps = {
    selected: isPrimary,
    multi: isMulti,
    "data-save-id": id,
    "data-layout": layout,
    "data-cursor": isAnchor || undefined,
    style: liStyle,
    draggable: dragFileIndex != null,
    onNativeDragStart: onDragStart,
    children,
  };

  return (
    <SaveContextMenu save={save}>
      {tumbling ? (
        <MotionCardRoot
          {...rootProps}
          initial={false}
          animate={tumbleTarget(id)}
          transition={TUMBLE_TRANSITION}
        />
      ) : (
        <Card.Root {...rootProps} />
      )}
    </SaveContextMenu>
  );
});

const SaveCardBody = memo(function SaveCardBody({
  save,
  layout,
  width,
}: {
  save: Save;
  layout?: CardLayout;
  width?: number;
}) {
  const pickOpts = useMediaPickOptions();
  const showName = useDisplayPref("name");
  const showDate = useDisplayPref("date");
  const packed = layout === "waterfall" || layout === "justified";
  const unit = useMemo(() => pickCardUnit(save, pickOpts), [save, pickOpts]);
  const primary = useMemo(
    () => pickPrimaryFile(save, pickOpts),
    [save, pickOpts],
  );
  const mediaStyle = useMemo<MediaAspectStyle>(() => {
    if (packed) return {};
    const { w, h } = aspectDimsFor(save, pickOpts, unit);
    const ratio = w && h ? clampRatio(w, h) : 1;
    return {
      "--card-aspect": w && h ? `${w} / ${h}` : "1 / 1",
      "--card-aspect-num": String(ratio),
    };
  }, [packed, save, pickOpts, unit]);
  const dateLabel = useMemo(() => formatAbsolute(save.savedAt), [save.savedAt]);
  return (
    <>
      <Card.Media style={mediaStyle}>
        <CardThumb save={save} layout={layout} width={width} />
        <Card.Overlay save={save} primary={primary} />
      </Card.Media>
      <Card.Meta
        title={showName ? (save.title ?? save.url) : undefined}
        time={showDate ? dateLabel : undefined}
      />
    </>
  );
});
