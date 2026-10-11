import {
  IconArrowRotateAnticlockwise,
  IconChatBubble,
  IconFile,
  IconFolder,
  IconImage,
  IconLink2,
  IconMagnifier,
  IconTrashXmark,
  IconUpload,
} from "@pond/icons";
import { useSelector } from "@tanstack/react-store";
import { useMemo } from "react";
import { addSavesToChat } from "@/features/agent";
import { selectLibraryNav } from "@/features/library/components/folder-sidebar/navigation";
import { newFolder } from "@/features/library/components/new-menu/actions";
import { useFolders } from "@/features/library/state/folders";
import {
  libraryChrome,
  useLibraryNav,
} from "@/features/library/state/library-chrome";
import { libraryHeader } from "@/features/library/state/library-header";
import {
  savedViews,
  useSavedViews,
} from "@/features/library/state/saved-views";
import {
  resetFilters,
  setSearchInput,
} from "@/features/library/state/view-store";
import {
  exportSelectionFiles,
  restoreSelection,
  trashSelection,
  useRecents,
} from "@/features/saves";
import { selection, useSelectionSize } from "@/features/saves/navigation";
import { pool, savesStore } from "@/features/saves/pool";
import type { Save } from "@/features/saves/types";
import { navigateTo } from "./commands";
import { matchingCommands, saveDetail, saveLabel } from "./search";
import type { MenuEntry, MenuGroup } from "./types";

interface MenuEntriesResult {
  entries: MenuEntry[];
  groups: MenuGroup[];
}

function SaveIcon({ save }: { save: Save }) {
  if (save.mediaType === "image") return <IconImage aria-hidden />;
  if (save.mediaType === "link") return <IconLink2 aria-hidden />;
  return <IconFile aria-hidden />;
}

export function useMenuEntries({
  query,
  deferredQuery,
  searchResults,
  onOpenSave,
}: {
  query: string;
  deferredQuery: string;
  searchResults: readonly Save[] | null | undefined;
  onOpenSave: (id: string) => void;
}): MenuEntriesResult {
  const nav = useLibraryNav();
  const selectionSize = useSelectionSize();
  const folders = useFolders();
  const views = useSavedViews();
  const recents = useRecents();
  const savesRevision = useSelector(savesStore, (state) => state.revision);

  const commandEntries = useMemo<MenuEntry[]>(
    () =>
      matchingCommands(query).map((command) => {
        const Icon = command.icon;
        return {
          id: `command:${command.id}`,
          group: command.group,
          label: command.label,
          detail: command.detail,
          icon: <Icon aria-hidden />,
          shortcut: command.shortcut,
          run: command.run,
        };
      }),
    [query],
  );

  const contextEntries = useMemo<MenuEntry[]>(() => {
    if (selectionSize > 0) {
      const group = `${selectionSize} Selected`;
      const selected = () => selection.snapshot();
      return [
        ...(nav.kind === "trash"
          ? []
          : [
              {
                id: "selection:add-to-chat",
                group,
                label: "Add to Chat",
                icon: <IconChatBubble aria-hidden />,
                run: () => addSavesToChat(selected()),
              },
            ]),
        {
          id: "selection:export",
          group,
          label: "Export Selection",
          icon: <IconUpload aria-hidden />,
          shortcut: "selection.export",
          run: () => void exportSelectionFiles(selected()),
        },
        nav.kind === "trash"
          ? {
              id: "selection:restore",
              group,
              label: "Restore from Trash",
              icon: <IconArrowRotateAnticlockwise aria-hidden />,
              shortcut: "save.restore",
              run: () => void restoreSelection(selected()),
            }
          : {
              id: "selection:trash",
              group,
              label: "Move to Trash",
              icon: <IconTrashXmark aria-hidden />,
              shortcut: "save.trash",
              run: () => void trashSelection(selected()),
            },
      ];
    }

    if (nav.kind === "folder") {
      return [
        {
          id: "folder:new-subfolder",
          group: "Current Folder",
          label: "New Subfolder",
          icon: <IconFolder aria-hidden />,
          run: () => newFolder(nav.id),
        },
      ];
    }

    return [];
  }, [nav, selectionSize]);

  const saveEntries = useMemo<MenuEntry[]>(() => {
    if (!deferredQuery || !searchResults) return [];
    return searchResults.slice(0, 7).map((save) => ({
      id: `save:${save.id}`,
      group: "Saves",
      label: saveLabel(save),
      detail: saveDetail(save),
      icon: <SaveIcon save={save} />,
      run: () => onOpenSave(save.id),
    }));
  }, [deferredQuery, searchResults, onOpenSave]);

  const recentEntries = useMemo<MenuEntry[]>(() => {
    void savesRevision;
    if (query.trim()) return [];
    return recents
      .map((entry) => pool.get(entry.saveId))
      .filter((save): save is Save => Boolean(save))
      .slice(0, 5)
      .map((save) => ({
        id: `recent:${save.id}`,
        group: "Recent",
        label: saveLabel(save),
        detail: saveDetail(save),
        icon: <SaveIcon save={save} />,
        run: () => onOpenSave(save.id),
      }));
  }, [onOpenSave, query, recents, savesRevision]);

  const folderEntries = useMemo<MenuEntry[]>(() => {
    const value = deferredQuery.toLocaleLowerCase();
    if (!value) return [];
    return folders
      .filter((folder) => folder.name.toLocaleLowerCase().includes(value))
      .slice(0, 5)
      .map((folder) => ({
        id: `folder:${folder.id}`,
        group: "Folders",
        label: folder.name,
        icon: <IconFolder aria-hidden />,
        run: () => selectLibraryNav({ kind: "folder", id: folder.id }),
      }));
  }, [deferredQuery, folders]);

  const viewEntries = useMemo<MenuEntry[]>(() => {
    const value = deferredQuery.toLocaleLowerCase();
    if (!value) return [];
    return views
      .filter(
        (view) =>
          view.kind !== "group" &&
          view.name.toLocaleLowerCase().includes(value),
      )
      .slice(0, 5)
      .map((view) => ({
        id: `view:${view.id}`,
        group: "Saved Views",
        label: view.name,
        icon: <IconMagnifier aria-hidden />,
        run: () => {
          selectLibraryNav({ kind: "all" });
          savedViews.select(view.id);
        },
      }));
  }, [deferredQuery, views]);

  const searchEntry = useMemo<MenuEntry | null>(() => {
    const value = query.trim();
    if (!value) return null;
    return {
      id: "search:library",
      group: "Search",
      label: "Search Library",
      detail: value,
      icon: <IconMagnifier aria-hidden />,
      run: () => {
        resetFilters();
        setSearchInput([], value, value);
        libraryChrome.setNav({ kind: "all" });
        navigateTo("/");
        libraryHeader.focusSearch();
      },
    };
  }, [query]);

  const entries = useMemo(
    () => [
      ...contextEntries,
      ...(searchEntry ? [searchEntry] : []),
      ...recentEntries,
      ...commandEntries,
      ...folderEntries,
      ...viewEntries,
      ...saveEntries,
    ],
    [
      commandEntries,
      contextEntries,
      folderEntries,
      recentEntries,
      saveEntries,
      searchEntry,
      viewEntries,
    ],
  );

  const groups = useMemo(() => {
    const contextualGroup = contextEntries[0]?.group;
    const order = query.trim()
      ? [
          ...(contextualGroup ? [contextualGroup] : []),
          "Search",
          "Create",
          "Import",
          "Navigate",
          "App",
          "Folders",
          "Saved Views",
          "Saves",
        ]
      : [
          ...(contextualGroup ? [contextualGroup] : []),
          "Recent",
          "Create",
          "Import",
          "Navigate",
          "App",
        ];
    return order
      .map((group) => ({
        group,
        entries: entries.filter((entry) => entry.group === group),
      }))
      .filter((section) => section.entries.length > 0);
  }, [contextEntries, entries, query]);

  return { entries, groups };
}
