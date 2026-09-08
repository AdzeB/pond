import {
  IconAlbum2Outline18,
  IconArrowRotateAnticlockwiseOutline18,
  IconClone2Outline18,
  IconDownloadOutline18,
  IconEyeOutline18,
  IconFileOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconGear3Outline18,
  IconGlobeOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconMagnifierOutline18,
  IconMsg2Outline18,
  IconTagsOutline18,
  IconTrash2Outline18,
  IconUploadOutline18,
  IconUserPlusOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import { sourceLabel } from "@pond/schema";
import { Dialog, Keyboard } from "@pond/ui";
import {
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  importClipboard,
  importEagle,
  importPaths,
  newFolder,
  newSource,
  newTag,
  runNewAction,
} from "@/features/library/components/new-menu/actions";
import {
  commandMenu,
  useCommandMenuOpen,
} from "@/features/library/state/command-menu";
import {
  libraryChrome,
  useLibraryNav,
} from "@/features/library/state/library-chrome";
import { libraryHeader } from "@/features/library/state/library-header";
import {
  selection,
  useSelectionSize,
} from "@/features/library/state/selection";
import {
  resetFilters,
  setSearchInput,
} from "@/features/library/state/view-store";
import { openSave } from "@/features/saves/lib/save-nav";
import {
  exportSelectionFiles,
  restoreSelection,
  trashSelection,
} from "@/features/saves/lib/selection";
import type { Save } from "@/features/saves/types";
import { useSearchResults } from "@/features/search/hooks/use-search-results";
import { openSettings } from "@/features/settings/lib/open-settings";
import { usePrefs } from "@/features/settings/state/prefs";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { getAppRouter } from "@/shared/lib/app-router";
import type { ShortcutId } from "@/shared/lib/shortcuts";
import styles from "./command-menu.module.css";

type CommandIcon = ComponentType<{ "aria-hidden"?: boolean }>;

interface CommandSpec {
  id: string;
  group: "Create" | "Import" | "Navigate" | "App";
  label: string;
  detail?: string;
  icon: CommandIcon;
  keywords: string;
  shortcut?: ShortcutId;
  run: () => void;
}

interface MenuEntry {
  id: string;
  group: string;
  label: string;
  detail?: string;
  icon: ReactNode;
  shortcut?: ShortcutId;
  run: () => void;
}

function go(path: string): void {
  getAppRouter()?.history.push(path);
}

const COMMANDS: readonly CommandSpec[] = [
  {
    id: "new-folder",
    group: "Create",
    label: "New Folder",
    icon: IconFolderOutline18,
    keywords: "create collection organize directory",
    run: () => newFolder(),
  },
  {
    id: "new-tag",
    group: "Create",
    label: "New Tag",
    icon: IconTagsOutline18,
    keywords: "create label organize",
    run: () => newTag("tag"),
  },
  {
    id: "new-tag-group",
    group: "Create",
    label: "New Tag Group",
    icon: IconVersionsOutline18,
    keywords: "create labels organize",
    run: () => newTag("tag-group"),
  },
  {
    id: "new-source",
    group: "Create",
    label: "New Source",
    icon: IconGlobeOutline18,
    keywords: "connect watch folder add account",
    shortcut: "sources.new",
    run: () => {
      libraryChrome.setNav({ kind: "sources" });
      go("/sources");
      sourceNewMenu.open();
    },
  },
  {
    id: "connect-source",
    group: "Create",
    label: "Connect a Source",
    icon: IconUserPlusOutline18,
    keywords: "add account sync watch import",
    run: () => newSource("connect"),
  },
  {
    id: "watch-account",
    group: "Create",
    label: "Watch Account",
    icon: IconEyeOutline18,
    keywords: "source public account follow import",
    run: () => newSource("watch"),
  },
  {
    id: "watched-folder",
    group: "Create",
    label: "Watched Folder",
    icon: IconFolderOpenOutline18,
    keywords: "auto import directory files copy local",
    run: () => void runNewAction(pickWatchedFolder),
  },
  {
    id: "import-files",
    group: "Import",
    label: "Import Files",
    icon: IconFileOutline18,
    keywords: "image video audio pdf document media",
    run: () => void runNewAction(() => importPaths("files")),
  },
  {
    id: "import-folders",
    group: "Import",
    label: "Import Folders",
    icon: IconFolderOpenOutline18,
    keywords: "directory files media",
    run: () => void runNewAction(() => importPaths("folders")),
  },
  {
    id: "import-clipboard",
    group: "Import",
    label: "Import from Clipboard",
    icon: IconClone2Outline18,
    keywords: "paste image files",
    run: () => void runNewAction(importClipboard),
  },
  {
    id: "import-eagle",
    group: "Import",
    label: "Import Eagle Library",
    icon: IconDownloadOutline18,
    keywords: "migrate archive package",
    run: () => void runNewAction(importEagle),
  },
  {
    id: "library",
    group: "Navigate",
    label: "Library",
    detail: "All saves",
    icon: IconAlbum2Outline18,
    keywords: "home saves archive",
    shortcut: "nav.library",
    run: () => {
      resetFilters();
      libraryChrome.setNav({ kind: "all" });
      go("/");
    },
  },
  {
    id: "sources",
    group: "Navigate",
    label: "Sources",
    detail: "Connected accounts and watches",
    icon: IconGlobeOutline18,
    keywords: "accounts connect watches",
    shortcut: "nav.sources",
    run: () => {
      libraryChrome.setNav({ kind: "sources" });
      go("/sources");
    },
  },
  {
    id: "downloads",
    group: "Navigate",
    label: "Downloads",
    detail: "Active and recent transfers",
    icon: IconDownloadOutline18,
    keywords: "transfers queue",
    shortcut: "nav.downloads",
    run: () => {
      libraryChrome.setNav({ kind: "downloads" });
      go("/downloads");
    },
  },
  {
    id: "tags",
    group: "Navigate",
    label: "Tags",
    detail: "Organize your library",
    icon: IconTagsOutline18,
    keywords: "labels organize",
    run: () => go("/tags"),
  },
  {
    id: "assistant",
    group: "Navigate",
    label: "Assistant",
    detail: "Ask your library",
    icon: IconMsg2Outline18,
    keywords: "ask chat ai",
    run: () => go("/assistant"),
  },
  {
    id: "trash",
    group: "Navigate",
    label: "Trash",
    detail: "Recently deleted saves",
    icon: IconTrash2Outline18,
    keywords: "deleted bin",
    shortcut: "nav.trash",
    run: () => {
      libraryChrome.setNav({ kind: "trash" });
      go("/trash");
    },
  },
  {
    id: "settings",
    group: "App",
    label: "Open Settings",
    detail: "Preferences, storage, and AI",
    icon: IconGear3Outline18,
    keywords: "preferences configuration",
    shortcut: "app.settings",
    run: () => openSettings(),
  },
];

function scoreCommand(command: CommandSpec, query: string): number {
  if (!query) return 1;
  const label = command.label.toLowerCase();
  const haystack =
    `${label} ${command.detail ?? ""} ${command.keywords}`.toLowerCase();
  if (label === query) return 5;
  if (label.startsWith(query)) return 4;
  if (label.includes(query)) return 3;
  if (haystack.includes(query)) return 2;
  const words = query.split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word)) ? 1 : 0;
}

function saveLabel(save: Save): string {
  return (
    save.title?.trim() ||
    save.description?.trim() ||
    save.notes?.trim() ||
    save.url
  );
}

function saveDetail(save: Save): string {
  const source = sourceLabel(save.source);
  return save.author?.trim() ? `${source} · ${save.author.trim()}` : source;
}

function SaveIcon({ save }: { save: Save }) {
  if (save.mediaType === "image") return <IconImageOutline18 aria-hidden />;
  if (save.mediaType === "link") return <IconLink2Outline18 aria-hidden />;
  return <IconFileOutline18 aria-hidden />;
}

function runAfterClose(run: () => void): void {
  commandMenu.close();
  requestAnimationFrame(run);
}

function useResultsHeight<LayoutKey>(open: boolean, layoutKey: LayoutKey) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [sized, setSized] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setHeight(null);
      setSized(false);
      return;
    }

    void layoutKey;
    if (!content) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const cap = Number.parseFloat(getComputedStyle(viewport).maxHeight);
      const next = Math.min(
        content.offsetHeight,
        Number.isFinite(cap) ? cap : content.offsetHeight,
      );
      if (next <= 0) return;
      setHeight((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [content, layoutKey, open]);

  useEffect(() => {
    if (!open || height == null) return;
    const id = requestAnimationFrame(() => setSized(true));
    return () => cancelAnimationFrame(id);
  }, [open, height]);

  return { viewportRef, contentRef: setContent, height, sized };
}

export function CommandMenuHost({
  useResults = useSearchResults,
  onOpenSave = openSave,
}: {
  useResults?: typeof useSearchResults;
  onOpenSave?: typeof openSave;
} = {}) {
  const open = useCommandMenuOpen();
  const nav = useLibraryNav();
  const selectionSize = useSelectionSize();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query.trim());
  const [ai] = usePrefs("ai");
  const indexed = Boolean(ai.semanticSearch || ai.enableClip);
  const search = useResults(open ? deferredQuery : "", {
    retrieve: indexed,
  });

  const commandEntries = useMemo<MenuEntry[]>(() => {
    const normalized = query.trim().toLowerCase();
    return COMMANDS.map((command) => ({
      command,
      score: scoreCommand(command, normalized),
    }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ command }) => {
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
      });
  }, [query]);

  const contextEntries = useMemo<MenuEntry[]>(() => {
    if (selectionSize > 0) {
      const group = `${selectionSize} Selected`;
      const selected = () => selection.snapshot();
      return [
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
              icon: <IconTrash2Outline18 aria-hidden />,
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
    if (!deferredQuery || !search.results) return [];
    return search.results.slice(0, 7).map((save) => ({
      id: `save:${save.id}`,
      group: "Saves",
      label: saveLabel(save),
      detail: saveDetail(save),
      icon: <SaveIcon save={save} />,
      run: () => onOpenSave(save.id),
    }));
  }, [deferredQuery, search.results, onOpenSave]);

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
        go("/");
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

  const {
    viewportRef: listRef,
    contentRef,
    height,
    sized,
  } = useResultsHeight(open, groups);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }

    setQuery("");
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= entries.length) setActiveIndex(0);
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, entries.length, listRef]);

  function execute(index: number): void {
    const entry = entries[index];
    if (entry) runAfterClose(entry.run);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(entries.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + Math.max(entries.length, 1)) %
          Math.max(entries.length, 1),
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(entries.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      execute(activeIndex);
    }
  }

  const resultsStyle: CSSProperties & { "--results-height"?: string } = {};
  if (height != null) resultsStyle["--results-height"] = `${height}px`;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) commandMenu.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} aria-label="Search Pond">
          <Dialog.Title className={styles.srOnly}>Search Pond</Dialog.Title>
          <div className={styles.search}>
            <IconMagnifierOutline18 className={styles.magnifier} aria-hidden />
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search Pond or type a command…"
              aria-label="Search Pond"
              role="combobox"
              aria-expanded="true"
              aria-controls="pond-command-menu-results"
              aria-activedescendant={entries[activeIndex]?.id}
              spellCheck={false}
            />
            <Keyboard.Key aria-hidden>esc</Keyboard.Key>
          </div>
          <div
            id="pond-command-menu-results"
            ref={listRef}
            className={styles.results}
            role="listbox"
            data-sized={sized || undefined}
            style={resultsStyle}
          >
            <div ref={contentRef} className={styles.content}>
              {groups.map((section) => (
                <section className={styles.group} key={section.group}>
                  <div className={styles.groupLabel}>{section.group}</div>
                  {section.entries.map((entry) => {
                    const index = entries.indexOf(entry);
                    const active = index === activeIndex;
                    return (
                      <button
                        id={entry.id}
                        key={entry.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-command-index={index}
                        className={styles.item}
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={() => execute(index)}
                      >
                        <span className={styles.icon}>{entry.icon}</span>
                        <span className={styles.copy}>
                          <span className={styles.label}>{entry.label}</span>
                          {entry.detail ? (
                            <span className={styles.detail}>
                              {entry.detail}
                            </span>
                          ) : null}
                        </span>
                        {entry.shortcut ? (
                          <span className={styles.shortcut}>
                            <ShortcutKeys id={entry.shortcut} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
