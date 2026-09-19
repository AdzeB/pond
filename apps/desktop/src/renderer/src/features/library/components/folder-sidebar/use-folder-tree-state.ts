import type { Folder } from "@pond/schema/db";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { flattenFolderTree } from "./tree";
import type { FolderDropState } from "./use-folder-drag-drop";

const COLLAPSED_FOLDERS_KEY = "pond:collapsed-folders";

function loadCollapsedFolders(): Set<string> {
  try {
    return new Set(
      z
        .array(z.string())
        .parse(JSON.parse(localStorage.getItem(COLLAPSED_FOLDERS_KEY) ?? "[]")),
    );
  } catch {
    return new Set();
  }
}

function persistCollapsedFolders(next: Set<string>): Set<string> {
  try {
    localStorage.setItem(COLLAPSED_FOLDERS_KEY, JSON.stringify([...next]));
  } catch {}
  return next;
}

export function useFolderTreeState(folderRows: Folder[]) {
  const [collapsed, setCollapsed] = useState(loadCollapsedFolders);
  const nested = useMemo(
    () => flattenFolderTree(folderRows, collapsed),
    [folderRows, collapsed],
  );
  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of folderRows) {
      if (row.parentId) ids.add(row.parentId);
    }
    return ids;
  }, [folderRows]);

  const revealFolder = useCallback((id: string) => {
    setCollapsed((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return persistCollapsedFolders(next);
    });
  }, []);

  function toggleFolder(id: string): void {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return persistCollapsedFolders(next);
    });
  }

  function toggleSameLevel(parentId: string | null, expanded: boolean): void {
    setCollapsed((previous) => {
      const next = new Set(previous);
      for (const row of folderRows) {
        if (row.parentId !== parentId || !parentIds.has(row.id)) continue;
        if (expanded) next.add(row.id);
        else next.delete(row.id);
      }
      return persistCollapsedFolders(next);
    });
  }

  function toggleAllFolders(): void {
    setCollapsed((previous) => {
      const next = new Set(previous);
      const expand = [...parentIds].some((id) => previous.has(id));
      for (const id of parentIds) {
        if (expand) next.delete(id);
        else next.add(id);
      }
      return persistCollapsedFolders(next);
    });
  }

  return {
    collapsed,
    nested,
    parentIds,
    revealFolder,
    toggleAllFolders,
    toggleFolder,
    toggleSameLevel,
  };
}

export function useRevealFolderDrop(
  folderDrop: FolderDropState | null,
  revealFolder: (id: string) => void,
): void {
  useEffect(() => {
    if (folderDrop?.kind !== "into") return;
    const timer = window.setTimeout(() => revealFolder(folderDrop.id), 500);
    return () => window.clearTimeout(timer);
  }, [folderDrop, revealFolder]);
}
