import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconArrowUpDownTrailOutline18 as Grip } from "@pond/icons/outline/18";
import type { Source, SourceVisibility } from "@pond/schema/db";
import { Dialog } from "@pond/ui";
import { VisibilitySelect } from "@/components/selects/visibility";
import { getSourceDef } from "@/lib/sources/registry";
import styles from "./styles.module.css";

const ICON_SIZE = 18;

function SourceIcon({ source }: { source: Source }) {
  const Icon = getSourceDef(source).icon;
  return <Icon width={ICON_SIZE} height={ICON_SIZE} />;
}

function SortableSourceRow({
  source,
  visibility,
  onVisibilityChange,
}: {
  source: Source;
  visibility: SourceVisibility;
  onVisibilityChange: (next: SourceVisibility) => void;
}) {
  const def = getSourceDef(source);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: source });

  return (
    <div
      ref={setNodeRef}
      className={styles.row}
      data-dragging={isDragging || undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={`Reorder ${def.label}`}
        {...attributes}
        {...listeners}
      >
        <Grip width={14} height={14} />
      </button>
      <span className={styles["row-icon"]} aria-hidden>
        <SourceIcon source={source} />
      </span>
      <span className={styles["row-label"]}>{def.label}</span>
      <VisibilitySelect
        value={visibility}
        onValueChange={onVisibilityChange}
        className={styles["row-select"]}
        align="end"
      />
    </div>
  );
}

export function CustomizeSourcesDialog({
  open,
  onOpenChange,
  entries,
  onReorder,
  onVisibilityChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ReadonlyArray<{ source: Source; visibility: SourceVisibility }>;
  onReorder: (order: Source[]) => void;
  onVisibilityChange: (source: Source, visibility: SourceVisibility) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const order = entries.map((entry) => entry.source);
    const oldIndex = order.indexOf(active.id as Source);
    const newIndex = order.indexOf(over.id as Source);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorder(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.dialog}>
          <Dialog.Title>Customize sources</Dialog.Title>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((entry) => entry.source)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.list}>
                {entries.map((entry) => (
                  <SortableSourceRow
                    key={entry.source}
                    source={entry.source}
                    visibility={entry.visibility}
                    onVisibilityChange={(next) =>
                      onVisibilityChange(entry.source, next)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
