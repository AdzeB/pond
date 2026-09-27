import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDndContext,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGripDotsVerticalOutline12 } from "@pond/icons/outline/12";
import {
  IconAlbum2Outline18,
  IconArrowDiagonalInOutline18,
  IconBookmarkOutline18,
  IconBookmarkSlashOutline18,
  IconChatBubblePenOutline18,
  IconClockRotateClockwiseOutline18,
  IconFolderBanOutline18,
  IconShuffleOutline18,
  IconTrashXmarkOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import type { SidebarDestination } from "@pond/schema";
import { Dialog, Switch } from "@pond/ui";
import { useReducedMotionConfig } from "motion/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  moveSidebarDestination,
  SIDEBAR_DESTINATION_GROUPS,
  SIDEBAR_DESTINATION_LABELS,
} from "@/features/settings/lib/sidebar-customization";
import { usePrefs } from "@/features/settings/state/prefs";
import {
  createSortableAnnouncements,
  SORTABLE_DROP_ANIMATION,
  SORTABLE_SCREEN_READER_INSTRUCTIONS,
} from "@/shared/lib/dnd-kit";
import styles from "./styles.module.css";

type DestinationGroup = {
  label: string;
  destinations: readonly SidebarDestination[];
};

function DestinationIcon({ destination }: { destination: SidebarDestination }) {
  switch (destination) {
    case "all":
      return <IconAlbum2Outline18 />;
    case "uncategorized":
      return <IconFolderBanOutline18 />;
    case "assistant":
      return <IconChatBubblePenOutline18 />;
    case "untagged":
      return <IconBookmarkSlashOutline18 />;
    case "recentlyUsed":
      return <IconClockRotateClockwiseOutline18 />;
    case "tags":
      return <IconBookmarkOutline18 />;
    case "random":
      return <IconShuffleOutline18 />;
    case "trash":
      return <IconTrashXmarkOutline18 />;
    case "downloads":
      return <IconWindowDownloadOutline18 />;
    case "sources":
      return <IconArrowDiagonalInOutline18 />;
  }
}

function SortableDestinationRow({
  destination,
  labelId,
  loaded,
  visible,
  onVisibleChange,
}: {
  destination: SidebarDestination;
  labelId: string;
  loaded: boolean;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}) {
  const reduceMotion = useReducedMotionConfig();
  const { activatorEvent } = useDndContext();
  const keyboardDrag = activatorEvent?.type.startsWith("key") ?? false;
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: destination, disabled: !loaded });

  return (
    <li
      className={styles.row}
      data-dragging={isDragging || undefined}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: reduceMotion || keyboardDrag ? "none" : transition,
      }}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className={styles.handle}
        ref={setActivatorNodeRef}
        aria-label={`Move ${SIDEBAR_DESTINATION_LABELS[destination]}`}
        disabled={!loaded}
      >
        <IconGripDotsVerticalOutline12 />
      </button>
      <span className={styles.icon} aria-hidden>
        <DestinationIcon destination={destination} />
      </span>
      <span className={styles.label} id={labelId}>
        {SIDEBAR_DESTINATION_LABELS[destination]}
      </span>
      <Switch.Root
        aria-labelledby={labelId}
        checked={visible}
        disabled={!loaded}
        onCheckedChange={onVisibleChange}
      />
    </li>
  );
}

function DestinationOverlay({
  destination,
}: {
  destination: SidebarDestination;
}) {
  return (
    <div className={styles.row} data-overlay>
      <span className={styles.handle} aria-hidden>
        <IconGripDotsVerticalOutline12 />
      </span>
      <span className={styles.icon} aria-hidden>
        <DestinationIcon destination={destination} />
      </span>
      <span className={styles.label}>
        {SIDEBAR_DESTINATION_LABELS[destination]}
      </span>
      <span className={styles["overlay-toggle"]} aria-hidden />
    </div>
  );
}

function SortableDestinationGroup({
  group,
  labelIdPrefix,
  loaded,
  order,
  visibleDestinations,
  onOrderChange,
  onVisibilityChange,
}: {
  group: DestinationGroup;
  labelIdPrefix: string;
  loaded: boolean;
  order: SidebarDestination[];
  visibleDestinations: Record<SidebarDestination, boolean>;
  onOrderChange: (order: SidebarDestination[]) => void;
  onVisibilityChange: (
    destination: SidebarDestination,
    visible: boolean,
  ) => void;
}) {
  const reduceMotion = useReducedMotionConfig();
  const [activeDestination, setActiveDestination] =
    useState<SidebarDestination | null>(null);
  const [keyboardDrag, setKeyboardDrag] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const destinations = order.filter((destination) =>
    group.destinations.some((item) => item === destination),
  );
  const announcements = createSortableAnnouncements(
    destinations,
    (id) => SIDEBAR_DESTINATION_LABELS[id as SidebarDestination],
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const destination = group.destinations.find((item) => item === active.id);
    const overDestination = group.destinations.find((item) => item === over.id);
    if (!destination || !overDestination) return;
    const targetIndex = destinations.indexOf(overDestination);
    if (targetIndex < 0) return;
    onOrderChange(
      moveSidebarDestination(
        order,
        group.destinations,
        destination,
        targetIndex,
      ),
    );
  };

  return (
    <section className={styles.section}>
      <h3>{group.label}</h3>
      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions: SORTABLE_SCREEN_READER_INSTRUCTIONS,
        }}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        sensors={sensors}
        onDragStart={({ active, activatorEvent }) => {
          setActiveDestination(active.id as SidebarDestination);
          setKeyboardDrag(activatorEvent.type.startsWith("key"));
        }}
        onDragCancel={() => {
          setActiveDestination(null);
          setKeyboardDrag(false);
        }}
        onDragEnd={(event) => {
          setActiveDestination(null);
          setKeyboardDrag(false);
          handleDragEnd(event);
        }}
      >
        <SortableContext
          items={destinations}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {destinations.map((destination) => (
              <SortableDestinationRow
                destination={destination}
                key={destination}
                labelId={`${labelIdPrefix}-${destination}`}
                loaded={loaded}
                visible={visibleDestinations[destination]}
                onVisibleChange={(visible) =>
                  onVisibilityChange(destination, visible)
                }
              />
            ))}
          </ul>
        </SortableContext>
        {createPortal(
          <DragOverlay
            dropAnimation={
              reduceMotion || keyboardDrag ? null : SORTABLE_DROP_ANIMATION
            }
            modifiers={[restrictToVerticalAxis]}
          >
            {activeDestination ? (
              <DestinationOverlay destination={activeDestination} />
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </section>
  );
}

export function SidebarCustomizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sidebar, patch, loaded] = usePrefs("sidebar");
  const [order, setOrder] = useState(sidebar.order);
  const showCountId = useId();

  useEffect(() => setOrder(sidebar.order), [sidebar.order]);

  const saveOrder = (next: SidebarDestination[]) => {
    setOrder(next);
    void patch({ order: next });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Customize Sidebar</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Content className={styles.content}>
            <div className={styles.defaultRow}>
              <span id={showCountId}>Show Count</span>
              <Switch.Root
                aria-labelledby={showCountId}
                checked={sidebar.badgeStyle === "count"}
                disabled={!loaded}
                onCheckedChange={(showCount) =>
                  void patch({
                    badgeStyle: showCount ? "count" : "none",
                    showCounts: showCount,
                  })
                }
              />
            </div>
            {SIDEBAR_DESTINATION_GROUPS.map((group) => (
              <SortableDestinationGroup
                group={group}
                key={group.label}
                labelIdPrefix={showCountId}
                loaded={loaded}
                order={order}
                visibleDestinations={sidebar.destinations}
                onOrderChange={saveOrder}
                onVisibilityChange={(destination, visible) =>
                  void patch({
                    destinations: {
                      ...sidebar.destinations,
                      [destination]: visible,
                    },
                  })
                }
              />
            ))}
          </Dialog.Content>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
