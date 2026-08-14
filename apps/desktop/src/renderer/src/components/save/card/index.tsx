import { motion } from "motion/react";
import { memo, useCallback, useMemo } from "react";
import { type CardLayout, CardThumb } from "@/components/save/card/media";
import { Card } from "@/components/save/card/parts";
import { SaveContextMenu } from "@/components/save/context-menu";
import { useLibraryCardCallbacks } from "@/components/shared/grid-context";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import { useSave } from "@/hooks/use-saves";
import { pickPrimaryUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";
import { formatAbsolute } from "@/lib/util/format";
import { aspectDimsFor, clampRatio } from "@/stores/aspect";
import { useDisplayPref } from "@/stores/display-prefs";
import {
  selection,
  useIsAnchor,
  useIsPrimary,
  useIsSelected,
} from "@/stores/selection";
import { useIsTumbling } from "@/stores/trash-tumble";

const MotionCardRoot = motion.create(Card.Root);

const TUMBLE_TRANSITION = {
  duration: 0.34,
  ease: [0.5, 0, 0.85, 0.4] as const,
};

/** Direction is derived from the id so a batch tumbles both ways instead of in lockstep. */
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
  /** Callbacks come from grid context so this memoized card doesn't re-render on a sibling's selection change. */
  const { onClick, onAuxClick, onDoubleClick } = useLibraryCardCallbacks();
  /** Per-id subscription: edits to this save wake only this card. */
  const save = useSave(id);
  const isMulti = useIsSelected(id);
  const isPrimary = useIsPrimary(id);
  const isAnchor = useIsAnchor(id);
  const tumbling = useIsTumbling(id);

  const liStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (packedWidth == null || packedHeight == null) return undefined;
    const base: React.CSSProperties = {
      width: `${packedWidth}px`,
      ["--packed-h" as never]: `${packedHeight}px`,
    };
    if (packedTop != null && packedLeft != null) {
      base.position = "absolute";
      base.top = 0;
      base.left = 0;
      base.transform = `translate3d(${packedLeft}px, ${packedTop}px, 0)`;
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
    <>
      <Card.Checkbox
        checked={isMulti}
        aria-label={isMulti ? "Deselect" : "Select"}
        onClick={onCheckboxClick}
      />
      <Card.Select
        aria-pressed={isPrimary}
        onClick={onSelectClick}
        onAuxClick={onSelectAuxClick}
        onDoubleClick={onSelectDoubleClick}
      >
        <SaveCardBody save={save} layout={layout} />
      </Card.Select>
    </>
  );

  const rootProps = {
    selected: isPrimary,
    multi: isMulti,
    "data-save-id": id,
    "data-cursor": isAnchor || undefined,
    style: liStyle,
    draggable: save.files.length > 0,
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
}: {
  save: Save;
  layout?: CardLayout;
}) {
  const pickOpts = useMediaPickOptions();
  const showName = useDisplayPref("name");
  const showDate = useDisplayPref("date");
  const packed = layout === "waterfall" || layout === "justified";
  const unit = useMemo(() => pickPrimaryUnit(save, pickOpts), [save, pickOpts]);
  const primary = useMemo(() => {
    if (!unit) return null;
    return (save.files ?? []).find((f) => f.path === unit.key) ?? null;
  }, [save.files, unit]);
  const mediaStyle = useMemo<React.CSSProperties>(() => {
    if (packed) return {} as React.CSSProperties;
    const { w, h } = aspectDimsFor(save, pickOpts, unit);
    const ratio = w && h ? clampRatio(w, h) : 1;
    return {
      "--card-aspect": w && h ? `${w} / ${h}` : "1 / 1",
      "--card-aspect-num": String(ratio),
    } as React.CSSProperties;
  }, [packed, save, pickOpts, unit]);
  const dateLabel = useMemo(() => formatAbsolute(save.savedAt), [save.savedAt]);
  return (
    <>
      <Card.Media style={mediaStyle}>
        <CardThumb save={save} layout={layout} />
        <Card.Overlay save={save} primary={primary} />
      </Card.Media>
      <Card.Meta
        title={showName ? (save.title ?? save.url) : undefined}
        time={showDate ? dateLabel : undefined}
      />
    </>
  );
});
