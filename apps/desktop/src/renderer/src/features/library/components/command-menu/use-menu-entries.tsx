import {
  IconArrowRotateAnticlockwiseOutline18,
  IconChatBubblePenOutline18,
  IconFileOutline18,
  IconFolderOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconMagnifierOutline18,
  IconTrashXmarkOutline18,
  IconUploadOutline18,
} from "@pond/icons/outline/18";
import { useMemo } from "react";
import { addSavesToChat } from "@/features/agent/lib/add-to-chat";
import { newFolder } from "@/features/library/components/new-menu/actions";
import {
  libraryChrome,
  useLibraryNav,
} from "@/features/library/state/library-chrome";
import { libraryHeader } from "@/features/library/state/library-header";
import {
  resetFilters,
  setSearchInput,
} from "@/features/library/state/view-store";
import {
  exportSelectionFiles,
  restoreSelection,
  trashSelection,
} from "@/features/saves/lib/selection";
import { selection, useSelectionSize } from "@/features/saves/state/selection";
import type { Save } from "@/features/saves/types";
import { navigateTo } from "./commands";
import { matchingCommands, saveDetail, saveLabel } from "./search";
import type { MenuEntry, MenuGroup } from "./types";

interface MenuEntriesResult {
  entries: MenuEntry[];
  groups: MenuGroup[];
}

function SaveIcon({ save }: { save: Save }) {
  if (save.mediaType === "image") return <IconImageOutline18 aria-hidden />;
  if (save.mediaType === "link") return <IconLink2Outline18 aria-hidden />;
  return <IconFileOutline18 aria-hidden />;
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
                icon: <IconChatBubblePenOutline18 aria-hidden />,
                run: () => addSavesToChat(selected()),
              },
            ]),
        {
          id: "selection:export",
          group,
          label: "Export Selection",
          icon: <IconUploadOutline18 aria-hidden />,
          shortcut: "selection.export",
          run: () => void exportSelectionFiles(selected()),
        },
        nav.kind === "trash"
          ? {
              id: "selection:restore",
              group,
              label: "Restore from Trash",
              icon: <IconArrowRotateAnticlockwiseOutline18 aria-hidden />,
              shortcut: "save.restore",
              run: () => void restoreSelection(selected()),
            }
          : {
              id: "selection:trash",
              group,
              label: "Move to Trash",
              icon: <IconTrashXmarkOutline18 aria-hidden />,
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
          icon: <IconFolderOutline18 aria-hidden />,
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

  const searchEntry = useMemo<MenuEntry | null>(() => {
    const value = query.trim();
    if (!value) return null;
    return {
      id: "search:library",
      group: "Search",
      label: "Search Library",
      detail: value,
      icon: <IconMagnifierOutline18 aria-hidden />,
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
      ...commandEntries,
      ...saveEntries,
    ],
    [commandEntries, contextEntries, saveEntries, searchEntry],
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
          "Saves",
        ]
      : [
          ...(contextualGroup ? [contextualGroup] : []),
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
