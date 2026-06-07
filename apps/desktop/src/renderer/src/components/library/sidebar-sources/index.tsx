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
import {
  IconCheckOutline18 as Check,
  IconChevronExpandYOutline18 as ChevronsUpDown,
  IconWindowSettingsOutline18 as Customize,
  IconDotsOutline18 as Dots,
  IconEyeOutline18 as Eye,
  IconArrowUpDownTrailOutline18 as Grip,
} from "@pond/icons/outline/18";
import type { Source, SourceVisibility } from "@pond/schema/db";
import { ContextMenu, Dialog, Menu, Select, Sidebar } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import React from "react";
import { useSidebarSources } from "@/lib/hooks/use-sidebar-sources";
import {
  getSourceDef,
  VISIBILITY_OPTIONS,
  visibilityLabel,
} from "@/lib/sources/registry";
import styles from "./styles.module.css";

const ICON_SIZE = 18;

function SourceIcon({ source }: { source: Source }) {
  const Icon = getSourceDef(source).icon;
  return <Icon width={ICON_SIZE} height={ICON_SIZE} />;
}

function VisibilitySubmenu({
  value,
  onChange,
}: {
  value: SourceVisibility;
  onChange: (next: SourceVisibility) => void;
}) {
  return (
    <ContextMenu.SubmenuRoot>
      <ContextMenu.SubmenuTrigger>
        <ContextMenu.ItemIcon>
          <Eye width={14} height={14} />
        </ContextMenu.ItemIcon>
        <ContextMenu.ItemLabel>Visibility</ContextMenu.ItemLabel>
      </ContextMenu.SubmenuTrigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.RadioGroup
              value={value}
              onValueChange={(next) => {
                if (next) onChange(next as SourceVisibility);
              }}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <ContextMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  closeOnClick
                >
                  <ContextMenu.ItemIcon>
                    <ContextMenu.RadioItemIndicator>
                      <Check width={14} height={14} />
                    </ContextMenu.RadioItemIndicator>
                  </ContextMenu.ItemIcon>
                  <ContextMenu.ItemLabel>{option.label}</ContextMenu.ItemLabel>
                </ContextMenu.RadioItem>
              ))}
            </ContextMenu.RadioGroup>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.SubmenuRoot>
  );
}

function SourceContextMenu({
  visibility,
  onVisibilityChange,
  onCustomize,
  children,
}: {
  visibility: SourceVisibility;
  onVisibilityChange: (next: SourceVisibility) => void;
  onCustomize: () => void;
  children: React.ReactElement;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <VisibilitySubmenu
              value={visibility}
              onChange={onVisibilityChange}
            />
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={onCustomize}>
              <ContextMenu.ItemIcon>
                <Customize width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Customize sources</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function SourceItem({
  source,
  count,
  visibility,
  onVisibilityChange,
  onCustomize,
}: {
  source: Source;
  count: number;
  visibility: SourceVisibility;
  onVisibilityChange: (next: SourceVisibility) => void;
  onCustomize: () => void;
}) {
  const def = getSourceDef(source);
  const empty = count === 0;

  return (
    <SourceContextMenu
      visibility={visibility}
      onVisibilityChange={onVisibilityChange}
      onCustomize={onCustomize}
    >
      <Sidebar.Anchor
        to="/source/$source"
        params={{ source }}
        data-empty={empty || undefined}
        aria-disabled={empty || undefined}
      >
        <Sidebar.Icon source>
          <SourceIcon source={source} />
        </Sidebar.Icon>
        {def.label}
      </Sidebar.Anchor>
    </SourceContextMenu>
  );
}

function MoreSources({
  sources,
  onCustomize,
}: {
  sources: ReadonlyArray<Source>;
  onCustomize: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Menu.Root>
      <Menu.Trigger
        render={(props) => (
          <Sidebar.Item {...props}>
            <Sidebar.Icon>
              <Dots />
            </Sidebar.Icon>
            More
          </Sidebar.Item>
        )}
      />
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup>
            {sources.map((source) => {
              const def = getSourceDef(source);
              return (
                <Menu.Item
                  key={source}
                  onClick={() =>
                    navigate({ to: "/source/$source", params: { source } })
                  }
                >
                  <Menu.ItemIcon>
                    <SourceIcon source={source} />
                  </Menu.ItemIcon>
                  <Menu.ItemLabel>{def.label}</Menu.ItemLabel>
                </Menu.Item>
              );
            })}
            <Menu.Separator />
            <Menu.Item onClick={onCustomize}>
              <Menu.ItemIcon>
                <Customize width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Customize sources</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
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
      <Select.Root<SourceVisibility>
        value={visibility}
        onValueChange={(next) => {
          if (next) onVisibilityChange(next);
        }}
      >
        <Select.Trigger className={styles["row-select"]}>
          <Select.Value>{visibilityLabel(visibility)}</Select.Value>
          <Select.Icon>
            <ChevronsUpDown width={14} height={14} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={6} align="end">
            <Select.Popup>
              {VISIBILITY_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check width={14} height={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function CustomizeSourcesDialog({
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

export function SidebarSources() {
  const {
    entries,
    pinnedSources,
    moreSources,
    showMore,
    counts,
    setVisibility,
    reorderSources,
  } = useSidebarSources();
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

  const visibilityBySource = React.useMemo(
    () => new Map(entries.map((entry) => [entry.source, entry.visibility])),
    [entries],
  );

  const openCustomize = React.useCallback(() => {
    setCustomizeOpen(true);
  }, []);

  return (
    <React.Fragment>
      <Sidebar.CollapsibleGroup>
        <ContextMenu.Root>
          <ContextMenu.Trigger
            render={
              <Sidebar.CollapsibleGroupLabel>
                Sources
              </Sidebar.CollapsibleGroupLabel>
            }
          />
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup>
                <ContextMenu.Item onClick={openCustomize}>
                  <ContextMenu.ItemIcon>
                    <Customize width={14} height={14} />
                  </ContextMenu.ItemIcon>
                  <ContextMenu.ItemLabel>
                    Customize sources
                  </ContextMenu.ItemLabel>
                </ContextMenu.Item>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>
        <Sidebar.CollapsibleGroupContent>
          {pinnedSources.map((source) => (
            <SourceItem
              key={source}
              source={source}
              count={counts.get(source) ?? 0}
              visibility={visibilityBySource.get(source) ?? "always"}
              onVisibilityChange={(next) => setVisibility(source, next)}
              onCustomize={openCustomize}
            />
          ))}
          {showMore ? (
            <MoreSources sources={moreSources} onCustomize={openCustomize} />
          ) : null}
        </Sidebar.CollapsibleGroupContent>
      </Sidebar.CollapsibleGroup>

      <CustomizeSourcesDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        entries={entries}
        onReorder={reorderSources}
        onVisibilityChange={setVisibility}
      />
    </React.Fragment>
  );
}
