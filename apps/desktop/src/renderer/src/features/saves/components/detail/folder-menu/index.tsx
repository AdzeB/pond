import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import {
  IconFolderOutline18 as Folder,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import {
  PickerPanel,
  type PickerSelectionState,
  usePickerCursor,
} from "@pond/ui";
import { type CSSProperties, useMemo, useState } from "react";
import styles from "./styles.module.css";

export interface FolderMenuItem {
  id: string;
  name: string;
  parentId?: string | null;
  count: number;
}

interface FolderNode extends FolderMenuItem {
  children: FolderNode[];
  depth: number;
  parentName: string | null;
  path: string;
}

type FolderPickerRow =
  | { id: string; kind: "folder"; folder: FolderNode }
  | { id: string; kind: "create"; name: string };

interface FolderRowStyle extends CSSProperties {
  "--folder-depth": number;
}

export interface FolderMenuProps {
  folders: readonly FolderMenuItem[];
  selectionSize: number;
  onToggle(folder: FolderMenuItem): void | Promise<void>;
  onCreate?(name: string): void | Promise<void>;
}

function buildTree(folders: readonly FolderMenuItem[]): FolderNode[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const children = new Map<string, FolderMenuItem[]>();
  const nested = new Set<string>();

  for (const folder of folders) {
    if (!folder.parentId || !byId.has(folder.parentId)) continue;
    const ancestors = new Set([folder.id]);
    let parentId: string | null | undefined = folder.parentId;
    let cyclic = false;
    while (parentId) {
      if (ancestors.has(parentId)) {
        cyclic = true;
        break;
      }
      ancestors.add(parentId);
      parentId = byId.get(parentId)?.parentId;
    }
    if (cyclic) continue;
    children.set(folder.parentId, [
      ...(children.get(folder.parentId) ?? []),
      folder,
    ]);
    nested.add(folder.id);
  }

  const compare = (a: FolderMenuItem, b: FolderMenuItem) =>
    a.name.localeCompare(b.name);
  const expand = (
    folder: FolderMenuItem,
    parents: readonly string[],
    depth: number,
  ): FolderNode => ({
    ...folder,
    depth,
    parentName: parents.at(-1) ?? null,
    path: [...parents, folder.name].join(" / "),
    children: (children.get(folder.id) ?? [])
      .toSorted(compare)
      .map((child) => expand(child, [...parents, folder.name], depth + 1)),
  });

  return folders
    .filter((folder) => !nested.has(folder.id))
    .toSorted(compare)
    .map((folder) => expand(folder, [], 0));
}

function flatten(nodes: readonly FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function visibleTree(
  nodes: readonly FolderNode[],
  collapsed: ReadonlySet<string>,
): FolderNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(!collapsed.has(node.id) ? visibleTree(node.children, collapsed) : []),
  ]);
}

function searchFolders(
  folders: readonly FolderNode[],
  query: string,
): FolderNode[] {
  const matching = folders.filter((folder) =>
    folder.path.toLowerCase().includes(query),
  );
  return matching.toSorted((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(query);
    const bStarts = b.name.toLowerCase().startsWith(query);
    return Number(bStarts) - Number(aStarts) || a.path.localeCompare(b.path);
  });
}

function rowId(row: FolderPickerRow) {
  return row.id;
}

export function FolderMenu({
  folders,
  selectionSize,
  onToggle,
  onCreate,
}: FolderMenuProps) {
  const tree = useMemo(() => buildTree(folders), [folders]);
  const flat = useMemo(() => flatten(tree), [tree]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const foldersForScope = useMemo(() => {
    if (normalizedQuery) return searchFolders(flat, normalizedQuery);
    return visibleTree(tree, collapsed);
  }, [collapsed, flat, normalizedQuery, tree]);
  const exactMatch = flat.some(
    (folder) => folder.name.toLowerCase() === normalizedQuery,
  );
  const rows = useMemo<FolderPickerRow[]>(() => {
    const folderRows = foldersForScope.map((folder) => ({
      id: `folder-${folder.id}`,
      kind: "folder" as const,
      folder,
    }));
    if (!normalizedQuery || !onCreate || exactMatch) return folderRows;
    return [
      ...folderRows,
      { id: `create-${normalizedQuery}`, kind: "create", name: query.trim() },
    ];
  }, [exactMatch, foldersForScope, normalizedQuery, onCreate, query]);
  const showTree = !normalizedQuery;

  function toggleExpanded(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function activate(row: FolderPickerRow) {
    if (row.kind === "create") {
      void onCreate?.(row.name);
      return;
    }
    void onToggle(row.folder);
  }

  const cursor = usePickerCursor({
    items: rows,
    getId: rowId,
    onActivate: activate,
    onHorizontalKey: (key, row) => {
      if (!showTree || row.kind !== "folder") return false;
      const { folder } = row;
      if (!folder.children.length) return true;
      if (key === "ArrowLeft" && !collapsed.has(folder.id))
        toggleExpanded(folder.id);
      if (key === "ArrowRight" && collapsed.has(folder.id))
        toggleExpanded(folder.id);
      return true;
    },
  });

  return (
    <PickerPanel.Surface className={styles.root}>
      <PickerPanel.Header>
        <PickerPanel.Search
          {...cursor.inputProps}
          aria-label="Search Folders"
          placeholder="Search…"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
      </PickerPanel.Header>

      <PickerPanel.Collection
        id={cursor.collectionId}
        className={styles.list}
        role={showTree ? "tree" : "listbox"}
        aria-label="Folders"
        aria-multiselectable="true"
      >
        {rows.map((row) => {
          const itemProps = cursor.getItemProps(row);
          if (row.kind === "create")
            return (
              <PickerPanel.Item
                {...itemProps}
                key={row.id}
                role="option"
                selected="unchecked"
              >
                <PickerPanel.ItemIcon>
                  <Plus />
                </PickerPanel.ItemIcon>
                <PickerPanel.ItemLabel title={`Create “${row.name}”`}>
                  Create “{row.name}”
                </PickerPanel.ItemLabel>
              </PickerPanel.Item>
            );

          const { folder } = row;
          const selection: PickerSelectionState =
            folder.count === selectionSize
              ? "checked"
              : folder.count > 0
                ? "mixed"
                : "unchecked";
          const rowStyle: FolderRowStyle = {
            "--folder-depth": showTree ? folder.depth : 0,
          };
          const accessibleName =
            selection === "mixed"
              ? `${folder.name}, some selected`
              : folder.name;
          return (
            <PickerPanel.Item
              {...itemProps}
              key={row.id}
              className={styles.row}
              style={rowStyle}
              role={showTree ? "treeitem" : "option"}
              aria-label={accessibleName}
              aria-level={showTree ? folder.depth + 1 : undefined}
              aria-selected={selection === "checked"}
              aria-expanded={
                showTree && folder.children.length
                  ? !collapsed.has(folder.id)
                  : undefined
              }
              selected={selection}
              data-depth={folder.depth}
              data-nested={showTree && folder.depth > 0 ? "" : undefined}
            >
              <span className={styles.guideline} aria-hidden="true" />
              <PickerPanel.SelectionIndicator state={selection} />
              <PickerPanel.ItemIcon className={styles.folderIcon}>
                <Folder />
              </PickerPanel.ItemIcon>
              <PickerPanel.ItemLabel title={folder.path}>
                {folder.name}
              </PickerPanel.ItemLabel>
              {!showTree && folder.parentName ? (
                <PickerPanel.ItemMeta
                  className={styles.parent}
                  title={folder.path}
                >
                  {folder.parentName}
                </PickerPanel.ItemMeta>
              ) : null}
              {showTree && folder.children.length ? (
                <span
                  className={styles.expand}
                  aria-hidden="true"
                  data-expanded={!collapsed.has(folder.id) ? "" : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpanded(folder.id);
                  }}
                >
                  <ChevronRight />
                </span>
              ) : null}
            </PickerPanel.Item>
          );
        })}

        {!rows.length ? (
          <PickerPanel.Empty>
            {normalizedQuery ? "No matching folders." : "No folders yet."}
          </PickerPanel.Empty>
        ) : null}
      </PickerPanel.Collection>
    </PickerPanel.Surface>
  );
}
