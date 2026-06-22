import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
  IconClockFill18 as Clock,
  IconMagnifierFill18 as Magnifier,
  IconArrowRotateClockwiseFill18 as Redo,
  IconNavigationFill18 as Send,
  IconSliders3Fill18 as Sliders,
  IconArrowRotateAnticlockwiseFill18 as Undo,
} from "@pond/icons/fill/18";
import {
  IconChevronRightOutline18 as ChevronRight,
  IconXmarkOutline18 as Clear,
  IconTrash2Outline18 as TrashAll,
} from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { cn } from "@pond/ui";
import {
  $createTextNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  BLUR_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNlCompiler } from "@/hooks/use-nl-query";
import {
  type SuggestionGroup,
  type SuggestionItem,
  useSearchSuggestions,
} from "@/hooks/use-search-suggestions";
import { predicateIsActive } from "@/lib/filter-helpers";
import { snappySpring } from "@/lib/motion";
import {
  describePredicate,
  FIELD_HINTS,
  FIELD_ICONS,
} from "@/lib/search-fields";
import {
  buildPredicate,
  canonicalKey,
  matchFieldToken,
  parseSearchInput,
  serializePredicate,
  serializeQuery,
  tokenize,
} from "@/lib/search-syntax";
import {
  clearHistory,
  recordSearch,
  useSearchHistory,
} from "@/stores/search-history";
import { clearSemanticQuery, setSemanticQuery } from "@/stores/semantic-store";
import {
  applyCompiledQuery,
  setSearchInput,
  useFilterQuery,
  useSearchText,
} from "@/stores/view-store";
import { LibraryFilterDialog } from "../library-filter-dialog";
import {
  $readCaret,
  $readSearchString,
  $setSearchString,
} from "./editor-state";
import { $isFilterChipNode, FilterChipNode } from "./filter-chip-node";
import styles from "./styles.module.css";

const LISTBOX_ID = "library-search-listbox";
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

// Window used to keep the commit guard up while a compiled query swaps into the
// editor and the blur settles, so a stray commit can't clobber the result.
const SEARCH_DEBOUNCE_MS = 200;

// Drop predicates that serialize to the same token, so the same `key:value`
// filter can't be added twice (e.g. typing `tag:design` after it's a chip).
function dedupePredicates(predicates: Predicate[]): Predicate[] {
  const seen = new Set<string>();
  const out: Predicate[] = [];
  for (const predicate of predicates) {
    const key = serializePredicate(predicate) ?? JSON.stringify(predicate);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(predicate);
  }
  return out;
}

// The whitespace-delimited token at `caret` (or empty token in whitespace).
function tokenAt(text: string, caret: number) {
  for (const token of tokenize(text)) {
    if (caret >= token.start && caret <= token.end) return token;
  }
  return { text: "", start: caret, end: caret };
}

// Reconstruct the full search string the store holds so the editor can be
// seeded to match it (chips for predicates + residual free text).
function storeToString(query: Query, q: string): string {
  return [serializeQuery(query), q].filter((s) => s.length > 0).join(" ");
}

// The handful of filters surfaced as one-tap rows in the empty state; the rest
// live behind "More filters".
const QUICK_FILTER_FIELDS: readonly FieldId[] = [
  "tags",
  "source",
  "type",
  "creator",
  "savedAt",
];

// A read-only render of a stored search: its predicates as compact chips plus
// any residual free text.
function HistoryPreview({ text }: { text: string }) {
  const parsed = useMemo(() => parseSearchInput(text), [text]);
  return (
    <span className={styles.recent}>
      {parsed.predicates.map((predicate, index) => {
        const chip = describePredicate(predicate);
        const ChipIcon = chip.icon;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: positional preview
            key={index}
            className={styles.recentChip}
            data-negated={chip.negated ? "" : undefined}
          >
            {chip.swatch ? (
              <span
                className={styles.recentSwatch}
                style={{ background: chip.swatch }}
              />
            ) : (
              <ChipIcon width={12} height={12} />
            )}
            {chip.label}
          </span>
        );
      })}
      {parsed.text ? (
        <span className={styles.recentText}>{parsed.text}</span>
      ) : null}
    </span>
  );
}

interface LibrarySearchProps {
  id?: string;
  className?: string;
  /** "panel" is the standalone composer; "dock" embeds in the dock pill with
   *  inline send/undo/redo controls and upward-opening suggestions. */
  variant?: "panel" | "dock";
  /** Focus the editor on mount (used when the dock morphs into ask mode). */
  autoFocus?: boolean;
  /** Called when the dock variant should collapse back to nav (Escape with the
   *  menu closed, or blur with an empty query). */
  onCollapse?: () => void;
}

export function LibrarySearch(props: LibrarySearchProps) {
  const initialConfig = useMemo(
    () => ({
      namespace: "library-search",
      nodes: [FilterChipNode],
      theme: { paragraph: styles.paragraph },
      onError: (error: Error) => {
        throw error;
      },
    }),
    [],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SearchField {...props} />
    </LexicalComposer>
  );
}

function SearchField({
  id,
  className,
  variant = "panel",
  autoFocus = false,
  onCollapse,
}: LibrarySearchProps) {
  const [editor] = useLexicalComposerContext();
  const storedQ = useSearchText();
  const storedQuery = useFilterQuery();

  const history = useSearchHistory();

  const isDock = variant === "dock";

  const [draft, setDraft] = useState(storedQ);
  const [caret, setCaret] = useState(storedQ.length);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const focusedRef = useRef(false);
  const onCollapseRef = useRef(onCollapse);
  onCollapseRef.current = onCollapse;
  // While the NL compiler applies its result, suppress the editor's commit path
  // so the debounced/blur commits can't clobber the compiled query.
  const suppressCommitRef = useRef(false);

  const compile = useNlCompiler();

  const { token, groups, empty } = useSearchSuggestions(draft, caret);
  const isEmpty = draft.trim().length === 0;

  // With an empty bar, swap the full field list for a curated set of quick
  // filters, a "More filters" entry, and recent searches.
  const emptyStateGroups = useMemo<SuggestionGroup[]>(() => {
    const filters: SuggestionItem[] = QUICK_FILTER_FIELDS.map((field) => ({
      id: `quick-${field}`,
      label: FIELD_META[field].label,
      hint: FIELD_HINTS[field],
      icon: FIELD_ICONS[field],
      insert: `${canonicalKey(field)}:`,
      keepOpen: true,
      action: "insert",
    }));
    filters.push({
      id: "more-filters",
      label: "More filters",
      hint: "dates, color, files, and more",
      icon: Sliders,
      insert: "",
      action: "dialog",
    });

    const out: SuggestionGroup[] = [
      { id: "filters", label: "Filters", items: filters },
    ];

    if (history.length > 0) {
      out.push({
        id: "recent",
        label: "Recent searches",
        items: history.map((entry) => ({
          id: `history-${entry.id}`,
          label: entry.text,
          icon: Clock,
          insert: entry.text,
          action: "history",
          historyId: entry.id,
        })),
      });
    }
    return out;
  }, [history]);

  const displayGroups = isEmpty ? emptyStateGroups : groups;
  const flatItems = useMemo(
    () => displayGroups.flatMap((g) => g.items),
    [displayGroups],
  );
  const open = focused && !dismissed && (flatItems.length > 0 || empty);

  const commitNow = useCallback(() => {
    if (suppressCommitRef.current) return;
    const text = editor.getEditorState().read(() => $readSearchString());
    const parsed = parseSearchInput(text);
    setSearchInput(dedupePredicates(parsed.predicates), parsed.text);
  }, [editor]);

  // Keep `draft`/`caret` (which drive suggestions) in sync with the editor.
  // Typing never runs the search; the filter only commits on Enter (or on a
  // deliberate action like picking a suggestion or removing a chip).
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const next = $readCaret();
        setDraft(next.text);
        setCaret(next.caret);
      });
    });
  }, [editor]);

  // Seed the editor from the store on mount and whenever an external change
  // (e.g. a saved view) lands while the user isn't editing.
  useEffect(() => {
    if (focusedRef.current) return;
    const next = storeToString(storedQuery, storedQ);
    editor.update(() => {
      if ($readSearchString() === next) return;
      $setSearchString(next);
    });
  }, [editor, storedQuery, storedQ]);

  // Record the current search into history (skips empties/dupes internally).
  const recordCurrent = useCallback(() => {
    const text = editor.getEditorState().read(() => $readSearchString());
    const parsed = parseSearchInput(text);
    recordSearch(
      { combinator: "and", rules: dedupePredicates(parsed.predicates) },
      parsed.text,
    );
  }, [editor]);

  // The "find anything" path: compile free-text into a structured query, apply
  // it as the authoritative filter (chips + residual), and stash any semantic
  // vector for hybrid ranking. Falls back to recording the raw text if nothing
  // resolved.
  const runNlCompile = useCallback(
    (text: string) => {
      void compile(text).then(({ query, residual, queryVector }) => {
        if (query.rules.length === 0) {
          // Nothing resolved to a filter: run the typed text as a plain
          // free-text search so Enter still does something.
          commitNow();
          recordCurrent();
          return;
        }
        // Block commits while we swap in the compiled query + editor display.
        suppressCommitRef.current = true;
        const display = storeToString(query, residual);
        editor.update(() => $setSearchString(display));
        applyCompiledQuery(query, residual);
        setSemanticQuery(queryVector, residual);
        recordSearch(query, residual);
        setDismissed(true);
        queueMicrotask(() => editor.blur());
        // Lift the guard after the debounce/blur window has passed.
        setTimeout(() => {
          suppressCommitRef.current = false;
        }, SEARCH_DEBOUNCE_MS + 200);
      });
    },
    [compile, editor, commitNow, recordCurrent],
  );

  // Apply a suggestion. "dialog" opens the in-depth filters; "history" replays
  // a stored search; "insert" (default) splices into the active token — field
  // picks ("tag:") stay text and keep the menu open, value picks complete a
  // token that rebuilds into a chip in place.
  const apply = useCallback(
    (item: SuggestionItem) => {
      if (item.action === "dialog") {
        setDismissed(true);
        setActiveIndex(-1);
        setDialogOpen(true);
        editor.blur();
        return;
      }

      if (item.action === "history") {
        editor.update(() => $setSearchString(item.insert));
        setActiveIndex(-1);
        setDismissed(true);
        commitNow();
        queueMicrotask(() => editor.blur());
        return;
      }

      const next =
        draft.slice(0, token.start) + item.insert + draft.slice(token.end);
      const pos = token.start + item.insert.length;
      editor.update(() => $setSearchString(next, pos));
      setActiveIndex(-1);
      if (item.keepOpen) {
        // Field pick (e.g. "tag:") is mid-typing — keep the menu open and wait
        // for a concrete value; don't run a search yet.
        setDismissed(false);
      } else {
        commitNow();
      }
      queueMicrotask(() => editor.focus());
    },
    [draft, token, editor, commitNow],
  );

  // Convert the token at the caret into a chip when it forms a valid predicate.
  const promote = useCallback((): boolean => {
    let did = false;
    editor.update(() => {
      const { text, caret: pos } = $readCaret();
      const tok = tokenAt(text, pos);
      const matched = matchFieldToken(tok.text);
      if (!matched) return;
      const predicate = buildPredicate(matched);
      if (!predicate || !predicateIsActive(predicate)) return;
      const needSpace = text[tok.end] !== " ";
      const nextText =
        text.slice(0, tok.end) + (needSpace ? " " : "") + text.slice(tok.end);
      $setSearchString(nextText, tok.end + 1);
      did = true;
    });
    if (did) commitNow();
    return did;
  }, [editor, commitNow]);

  // Enter handler: purely structured input keeps the existing behavior; free
  // text is routed through the NL "find anything" compiler.
  const submit = useCallback(() => {
    const text = editor.getEditorState().read(() => $readSearchString());
    const parsed = parseSearchInput(text);
    if (parsed.text.trim().length === 0) {
      // Purely structured: promote any pending token, then apply the filters.
      promote();
      commitNow();
      recordCurrent();
      return;
    }
    runNlCompile(text);
  }, [editor, promote, commitNow, recordCurrent, runNlCompile]);

  // Re-expand an adjacent chip into editable text instead of deleting it.
  const editAdjacentChip = useCallback((): boolean => {
    let handled = false;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
      const anchor = selection.anchor;
      const node = anchor.getNode();
      let chip: FilterChipNode | null = null;

      if ($isFilterChipNode(node)) {
        chip = node;
      } else if ($isTextNode(node) && anchor.offset === 0) {
        const prev = node.getPreviousSibling();
        if ($isFilterChipNode(prev)) chip = prev;
      } else if ($isElementNode(node)) {
        const child = node.getChildAtIndex(anchor.offset - 1);
        if ($isFilterChipNode(child)) chip = child;
      }

      if (!chip) return;
      const tokenText = serializePredicate(chip.getPredicate()) ?? "";
      const textNode = $createTextNode(tokenText);
      chip.replace(textNode);
      textNode.select(tokenText.length, tokenText.length);
      handled = true;
    });
    if (handled) commitNow();
    return handled;
  }, [editor, commitNow]);

  const clear = useCallback(() => {
    editor.update(() => $setSearchString(""));
    setActiveIndex(-1);
    setDismissed(false);
    clearSemanticQuery();
    commitNow();
    queueMicrotask(() => editor.focus());
  }, [editor, commitNow]);

  const undo = useCallback(() => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    queueMicrotask(() => editor.focus());
  }, [editor]);

  const redo = useCallback(() => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
    queueMicrotask(() => editor.focus());
  }, [editor]);

  // Refs let the Lexical command handlers read the latest menu state without
  // re-registering the commands on every keystroke.
  const openRef = useRef(open);
  const activeIndexRef = useRef(activeIndex);
  const flatItemsRef = useRef(flatItems);
  const applyRef = useRef(apply);
  const promoteRef = useRef(promote);
  const editChipRef = useRef(editAdjacentChip);
  const submitRef = useRef(submit);
  openRef.current = open;
  activeIndexRef.current = activeIndex;
  flatItemsRef.current = flatItems;
  applyRef.current = apply;
  promoteRef.current = promote;
  editChipRef.current = editAdjacentChip;
  submitRef.current = submit;

  useEffect(() => {
    const cleanups = [
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (!openRef.current) return false;
          event?.preventDefault();
          const count = flatItemsRef.current.length;
          if (count > 0) setActiveIndex((i) => (i + 1) % count);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (!openRef.current) return false;
          event?.preventDefault();
          const count = flatItemsRef.current.length;
          if (count > 0) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          // Single-line: Enter never inserts a newline.
          event?.preventDefault();
          const idx = activeIndexRef.current;
          const items = flatItemsRef.current;
          if (openRef.current && idx >= 0 && idx < items.length) {
            const item = items[idx];
            if (item) applyRef.current(item);
            return true;
          }
          // Treat Enter as submitting: structured input commits as-is, free text
          // is compiled into a structured query by the find-anything compiler.
          submitRef.current();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          const idx = activeIndexRef.current;
          const items = flatItemsRef.current;
          if (openRef.current && idx >= 0 && idx < items.length) {
            const item = items[idx];
            if (item) {
              event?.preventDefault();
              applyRef.current(item);
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_SPACE_COMMAND,
        (event) => {
          if (promoteRef.current()) {
            event?.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => editChipRef.current(),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (openRef.current) {
            setDismissed(true);
            setActiveIndex(-1);
          } else {
            editor.blur();
            onCollapseRef.current?.();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          focusedRef.current = true;
          setFocused(true);
          setDismissed(false);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          focusedRef.current = false;
          setFocused(false);
          // Blur never runs the search — only Enter commits. Collapse the dock
          // back to nav when nothing was typed; otherwise keep the composer open
          // so an un-submitted draft isn't lost.
          const text = editor.getEditorState().read(() => $readSearchString());
          if (text.trim().length === 0) onCollapseRef.current?.();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [editor]);

  // Focus the editor when the dock morphs into ask mode.
  useEffect(() => {
    if (!autoFocus) return;
    const raf = requestAnimationFrame(() => editor.focus());
    return () => cancelAnimationFrame(raf);
  }, [autoFocus, editor]);

  const focusFromControl = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("button") || target.closest(`.${styles.input}`)) {
        return;
      }
      event.preventDefault();
      editor.focus();
    },
    [editor],
  );

  const hasContent = draft.trim().length > 0;

  return (
    <div className={cn(styles.root, isDock && styles.dock, className)}>
      {isDock ? (
        <div className={styles.controls}>
          <button
            type="button"
            className={cn(styles.controlBtn, styles.send)}
            aria-label="Ask"
            onMouseDown={(event) => event.preventDefault()}
            onClick={submit}
          >
            <Send width={16} height={16} />
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            aria-label="Undo"
            disabled={!canUndo}
            onMouseDown={(event) => event.preventDefault()}
            onClick={undo}
          >
            <Undo width={16} height={16} />
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            aria-label="Redo"
            disabled={!canRedo}
            onMouseDown={(event) => event.preventDefault()}
            onClick={redo}
          >
            <Redo width={16} height={16} />
          </button>
          <span className={styles.controlsSep} aria-hidden />
        </div>
      ) : null}

      {/* biome-ignore lint/a11y/noStaticElementInteractions: clicking the padding focuses the editor */}
      <div
        className={styles.control}
        data-focus={focused ? "" : undefined}
        onMouseDown={focusFromControl}
      >
        {isDock ? null : (
          <span className={styles.icon}>
            <Magnifier />
          </span>
        )}

        <div className={styles.editor}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                id={id}
                className={styles.input}
                spellCheck={false}
                role="combobox"
                ariaLabel="Search and filter saves"
                ariaAutoComplete="list"
                ariaControls={LISTBOX_ID}
                ariaExpanded={open}
                ariaActiveDescendant={
                  open && activeIndex >= 0 ? optionId(activeIndex) : undefined
                }
              />
            }
            placeholder={
              <span className={styles.placeholder}>Ask anything…</span>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
        </div>

        {hasContent ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <Clear width={14} height={14} />
          </button>
        ) : isDock ? (
          <kbd className={styles.kbd}>⌘/</kbd>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={LISTBOX_ID}
            role="listbox"
            className={cn(styles.popup, isDock && styles.popupUp)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={snappySpring}
            onMouseDown={(event) => event.preventDefault()}
          >
            {empty ? <div className={styles.empty}>No matches</div> : null}

            {displayGroups.map((group) => (
              <div key={group.id} className={styles.group}>
                {group.label ? (
                  <div className={styles.groupLabel}>
                    <span>{group.label}</span>
                    {group.id === "recent" ? (
                      <button
                        type="button"
                        className={styles.clearAll}
                        aria-label="Clear recent searches"
                        onClick={() => clearHistory()}
                      >
                        <TrashAll width={13} height={13} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {group.items.map((item) => {
                  const index = flatItems.indexOf(item);
                  const Icon = item.icon;
                  const isHistory = item.action === "history";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      data-active={index === activeIndex ? "" : undefined}
                      className={styles.option}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => apply(item)}
                    >
                      {item.swatch ? (
                        <span
                          className={styles.swatch}
                          style={{ background: item.swatch }}
                        />
                      ) : Icon ? (
                        <span className={styles.optionIcon}>
                          <Icon width={16} height={16} />
                        </span>
                      ) : null}
                      {isHistory ? (
                        <HistoryPreview text={item.insert} />
                      ) : (
                        <span className={styles.optionLabel}>{item.label}</span>
                      )}
                      {item.action === "dialog" ? (
                        <span className={styles.optionChevron}>
                          <ChevronRight width={14} height={14} />
                        </span>
                      ) : item.hint && !isHistory ? (
                        <span className={styles.optionHint}>{item.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}

            {isEmpty ? null : (
              <div className={styles.tips}>
                <span className={styles.tip}>type:image</span>
                <span className={styles.tip}>tag:design</span>
                <span className={styles.tip}>saved:past-week</span>
                <span className={styles.tip}>-source:arena</span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <LibraryFilterDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
