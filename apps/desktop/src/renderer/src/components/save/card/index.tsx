import { motion } from "motion/react";
import { memo, useCallback, useMemo } from "react";
import { useSaveCardModel } from "@/components/save/card/model";
import { Card } from "@/components/save/card/parts";
import type {
  LibraryCardSlot,
  LibraryCardView,
} from "@/components/save/card/types";
import { GridCard } from "@/components/save/card/views/grid";
import { JustifiedCard } from "@/components/save/card/views/justified";
import { ListCard } from "@/components/save/card/views/list";
import { WaterfallCard } from "@/components/save/card/views/waterfall";
import { SaveContextMenu } from "@/components/save/context-menu";
import { useLibraryCardCallbacks } from "@/components/shared/grid-context";
import { useSave } from "@/hooks/use-saves";
import { resolveFileIndex } from "@/lib/save/actions";
import { startNativeDrag } from "@/lib/save/start-drag";
import type { Save } from "@/lib/types";
import { useIsAnchor, useIsPrimary, useIsSelected } from "@/stores/selection";
import { useIsTumbling } from "@/stores/trash-tumble";

interface PackedCardStyle extends React.CSSProperties {
  "--card-preview-height": string;
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
  view: LibraryCardView;
  slot: LibraryCardSlot;
}

export const SaveCard = memo(function SaveCard({
  id,
  view,
  slot,
}: SaveCardProps) {
  const { onClick, onAuxClick, onDoubleClick } = useLibraryCardCallbacks();
  const save = useSave(id);
  const isMulti = useIsSelected(id);
  const isPrimary = useIsPrimary(id);
  const isAnchor = useIsAnchor(id);
  const tumbling = useIsTumbling(id);

  const style = useMemo<PackedCardStyle>(() => {
    const base: PackedCardStyle = {
      width: `${slot.width}px`,
      height: `${slot.height}px`,
      "--card-preview-height": `${slot.previewHeight}px`,
    };
    base.position = "absolute";
    base.top = 0;
    base.left = 0;
    base.transform = `translate3d(${slot.left}px, ${slot.top}px, 0)`;
    return base;
  }, [slot]);

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
      <SaveCardBody save={save} view={view} width={slot.width} />
    </Card.Select>
  );

  const rootProps = {
    selected: isPrimary,
    multi: isMulti,
    "data-library-card": "",
    "data-save-id": id,
    "data-view": view,
    "data-cursor": isAnchor || undefined,
    style,
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
  view,
  width,
}: {
  save: Save;
  view: LibraryCardView;
  width?: number;
}) {
  const model = useSaveCardModel(save, view === "grid");
  if (view === "grid") return <GridCard model={model} width={width} />;
  if (view === "waterfall") {
    return <WaterfallCard model={model} width={width} />;
  }
  if (view === "justified") {
    return <JustifiedCard model={model} width={width} />;
  }
  return <ListCard model={model} width={width} />;
});
