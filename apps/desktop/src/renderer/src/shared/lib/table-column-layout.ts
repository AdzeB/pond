import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { pondScopedKey } from "@/shared/lib/pond-scope";

export interface TableColumnSpec<Id extends string> {
  id: Id;
  label: string;
}

export interface TableSort<Id extends string> {
  id: Id;
  desc: boolean;
}

export interface TableColumnLayout<Id extends string> {
  order: Id[];
  hidden: Id[];
  sort: TableSort<Id> | null;
}

export interface TableColumnLayoutController<Id extends string> {
  snapshot(): TableColumnLayout<Id>;
  setHidden(id: Id, hidden: boolean): void;
  setSort(sort: TableSort<Id> | null): void;
  applyVisibleOrder(visibleOrder: readonly string[]): void;
  reset(): void;
  useLayout(): TableColumnLayout<Id>;
  normalize(value: unknown): TableColumnLayout<Id>;
  mergeVisibleOrder(
    order: readonly Id[],
    hidden: readonly Id[],
    visibleOrder: readonly string[],
  ): Id[];
  defaultLayout(): TableColumnLayout<Id>;
}

export function createTableColumnLayout<Id extends string>({
  storageKey,
  columns,
  lockedId,
  defaultSort = null,
}: {
  storageKey: string;
  columns: readonly TableColumnSpec<Id>[];
  lockedId: Id;
  defaultSort?: TableSort<Id> | null;
}): TableColumnLayoutController<Id> {
  const columnIds = columns.map((column) => column.id);

  function isColumnId(value: unknown): value is Id {
    return columnIds.some((id) => id === value);
  }

  function defaultLayout(): TableColumnLayout<Id> {
    return { order: [...columnIds], hidden: [], sort: defaultSort };
  }

  function mergeVisibleOrder(
    order: readonly Id[],
    hidden: readonly Id[],
    visibleOrder: readonly string[],
  ): Id[] {
    const concealed = new Set(hidden);
    let index = 0;
    return order.map((id) => {
      if (concealed.has(id)) return id;
      const next = visibleOrder[index++];
      return isColumnId(next) ? next : id;
    });
  }

  function normalize(value: unknown): TableColumnLayout<Id> {
    const record =
      value && typeof value === "object"
        ? (value as { order?: unknown; hidden?: unknown; sort?: unknown })
        : {};
    const seen = new Set<Id>();
    const order: Id[] = [];
    if (Array.isArray(record.order)) {
      for (const id of record.order) {
        if (!isColumnId(id) || seen.has(id)) continue;
        seen.add(id);
        order.push(id);
      }
    }
    for (const id of columnIds) {
      if (!seen.has(id)) order.push(id);
    }
    const hidden = Array.isArray(record.hidden)
      ? record.hidden.filter(
          (id): id is Id =>
            isColumnId(id) && id !== lockedId && order.includes(id),
        )
      : [];
    const sortRecord =
      record.sort && typeof record.sort === "object"
        ? (record.sort as { id?: unknown; desc?: unknown })
        : null;
    const sort =
      sortRecord && isColumnId(sortRecord.id)
        ? { id: sortRecord.id, desc: sortRecord.desc === true }
        : defaultSort;
    return { order, hidden: [...new Set(hidden)], sort };
  }

  function key(): string {
    return pondScopedKey(storageKey);
  }

  function readLayout(): TableColumnLayout<Id> {
    try {
      const raw = localStorage.getItem(key());
      if (!raw) return defaultLayout();
      return normalize(JSON.parse(raw));
    } catch {
      return defaultLayout();
    }
  }

  function writeLayout(layout: TableColumnLayout<Id>): TableColumnLayout<Id> {
    try {
      localStorage.setItem(key(), JSON.stringify(layout));
    } catch {
      return layout;
    }
    return layout;
  }

  const store = new Store<TableColumnLayout<Id>>(readLayout());

  return {
    snapshot: () => store.state,
    setHidden(id, hidden) {
      if (id === lockedId) return;
      store.setState((state) => {
        const next = new Set(state.hidden);
        if (hidden) next.add(id);
        else next.delete(id);
        return writeLayout({
          ...state,
          hidden: state.order.filter((columnId) => next.has(columnId)),
        });
      });
    },
    setSort(sort) {
      store.setState((state) => writeLayout({ ...state, sort }));
    },
    applyVisibleOrder(visibleOrder) {
      store.setState((state) =>
        writeLayout({
          ...state,
          order: mergeVisibleOrder(state.order, state.hidden, visibleOrder),
        }),
      );
    },
    reset() {
      store.setState(() => writeLayout(defaultLayout()));
    },
    useLayout() {
      return useSelector(store, (state) => state);
    },
    normalize,
    mergeVisibleOrder,
    defaultLayout,
  };
}
