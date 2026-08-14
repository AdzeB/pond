import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { IconCircleXmarkFill18 as Clear } from "@pond/icons/fill/18";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import {
  Button,
  Keyboard,
  Loader,
  Shimmer,
  Suggestion,
  Toggle,
  ToggleGroup,
  Tooltip,
} from "@pond/ui";
import { Calligraph } from "calligraph";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  LineBreakNode,
} from "lexical";
import { useEffect, useMemo, useRef } from "react";
import { runAskSuggestion, useNlSearch } from "@/hooks/use-ask";
import { useNlFacets } from "@/hooks/use-nl-query";
import { parseSearchInput, serializeQuery } from "@/lib/search/syntax";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import { useTags } from "@/stores/tags";
import {
  setAiMode,
  setSearchInput,
  useAiMode,
  useFilterQuery,
  useSearchInput,
  useSearchText,
} from "@/stores/view-store";
import { $readSearchString } from "./lib/editor-state";
import { FilterTokenNode } from "./lib/token-node";
import { FilterTokenPlugin } from "./lib/token-plugin";
import { FilterTypeahead } from "./lib/typeahead";
import styles from "./styles.module.css";

interface ComposerProps {
  autoFocus?: boolean;
  onCollapse?: () => void;
}

export function SearchComposer(props: ComposerProps) {
  const initialConfig = useMemo(
    () => ({
      namespace: "search-composer",
      nodes: [FilterTokenNode],
      theme: { paragraph: styles.paragraph },
      onError: (error: Error) => {
        console.error("[pond search]", error);
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

function ThinkingPill({
  onCancel,
  onClose,
}: {
  onCancel: () => void;
  onClose?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className={styles["thinking-pill"]} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden>
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
        <svg
          className={styles["spinner-glyph"]}
          width="14"
          height="14"
          viewBox="0 0 18 18"
          fill="none"
        >
          <circle
            cx="9"
            cy="9"
            r="7"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="2.5"
          />
          <path
            d="M16 9C16 5.13401 12.866 2 9 2"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={styles["thinking-text"]}>
        <Shimmer.Root>Thinking</Shimmer.Root>
      </span>
      <Button
        icon
        size="xs"
        variant="ghost"
        aria-label="Cancel search"
        className={styles.clear}
        onClick={onCancel}
      >
        <Clear />
      </Button>
      {onClose ? (
        <Button
          icon
          size="xs"
          variant="ghost"
          aria-label="Close search"
          className={styles.close}
          onClick={() => {
            onCancel();
            onClose();
          }}
        >
          <IconXmarkOutline12 />
        </Button>
      ) : null}
    </div>
  );
}

function SearchField({ autoFocus = false, onCollapse }: ComposerProps) {
  const [editor] = useLexicalComposerContext();
  const tags = useTags();
  const facets = useNlFacets();
  const aiMode = useAiMode();
  const ask = useAskResult();
  const runNl = useNlSearch();
  const seededRef = useRef(false);
  const aiModeRef = useRef(aiMode);
  aiModeRef.current = aiMode;
  const runNlRef = useRef(runNl);
  runNlRef.current = runNl;

  const tagNames = useMemo(() => tags.map((t) => t.name), [tags]);

  /** Seed once from the last verbatim field text (or a reconstructed query) so closing the dock keeps the filter. */
  const seedInput = useSearchInput();
  const seedQuery = useFilterQuery();
  const seedText = useSearchText();
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const serialized =
      seedInput.trim() ||
      [serializeQuery(seedQuery), seedText].filter(Boolean).join(" ");
    if (!serialized.trim()) return;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(`${serialized} `));
      root.append(paragraph);
      paragraph.selectEnd();
    });
  }, [editor, seedInput, seedQuery, seedText]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const raw = $readSearchString();
        if (aiModeRef.current) {
          setSearchInput([], "", raw);
          return;
        }
        const parsed = parseSearchInput(raw);
        setSearchInput(parsed.predicates, parsed.text, raw);
      });
    });
  }, [editor]);

  useEffect(() => {
    if (aiMode) return;
    editor.getEditorState().read(() => {
      const raw = $readSearchString();
      const parsed = parseSearchInput(raw);
      setSearchInput(parsed.predicates, parsed.text, raw);
    });
  }, [aiMode, editor]);

  const onCollapseRef = useRef(onCollapse);
  onCollapseRef.current = onCollapse;

  const toggleAiMode = () => {
    const next = !aiModeRef.current;
    if (!next) clearAsk();
    setAiMode(next);
    editor.focus();
  };
  const toggleAiModeRef = useRef(toggleAiMode);
  toggleAiModeRef.current = toggleAiMode;

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        onCollapseRef.current?.();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  /** Typeahead registers Tab at normal priority; this only runs when that menu is closed. */
  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        event?.preventDefault();
        toggleAiModeRef.current();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  useEffect(() => {
    const submitAi = () => {
      if (!aiModeRef.current) return false;
      let raw = "";
      editor.getEditorState().read(() => {
        raw = $readSearchString().trim();
      });
      if (raw) void runNlRef.current(raw);
      return true;
    };
    const swallowBreak = () => true;
    const unregisterBreakHigh = editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      submitAi,
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterParagraphHigh = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      submitAi,
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterBreak = editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      swallowBreak,
      COMMAND_PRIORITY_LOW,
    );
    const unregisterParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      swallowBreak,
      COMMAND_PRIORITY_LOW,
    );
    const unregisterTransform = editor.registerNodeTransform(
      LineBreakNode,
      (node) => {
        node.replace($createTextNode(" "));
      },
    );
    return () => {
      unregisterBreakHigh();
      unregisterParagraphHigh();
      unregisterBreak();
      unregisterParagraph();
      unregisterTransform();
    };
  }, [editor]);

  const thinking = ask.active && ask.status === "thinking";
  const showSuggestions =
    ask.active &&
    ask.status === "done" &&
    ask.count === 0 &&
    ask.suggestions.length > 0;

  const clearField = () => {
    clearAsk();
    setSearchInput([], "", "");
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode());
    });
  };

  const hasText = seedInput.trim().length > 0 || ask.active;

  if (thinking) {
    return <ThinkingPill onCancel={clearAsk} onClose={onCollapse} />;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.editor}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={styles.input}
                spellCheck={false}
                ariaLabel={aiMode ? "AI search" : "Search filters"}
              />
            }
            placeholder={
              <span className={styles.placeholder}>
                <Calligraph autoSize={false}>
                  {aiMode ? "Ask your library…" : "Filter your library…"}
                </Calligraph>
              </span>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          {autoFocus ? <AutoFocusPlugin /> : null}
          {aiMode ? null : (
            <>
              <FilterTokenPlugin />
              <FilterTypeahead
                tags={tagNames}
                sources={facets.sources}
                creators={facets.creators}
              />
            </>
          )}
        </div>
        <Tooltip
          label="Switch mode"
          shortcut={<Keyboard.Key>Tab</Keyboard.Key>}
        >
          <span className={styles.modes}>
            <ToggleGroup
              value={[aiMode ? "ask" : "filter"]}
              aria-label="Search mode"
              onValueChange={(next) => {
                const pick = next[0];
                if (pick !== "ask" && pick !== "filter") return;
                const ask = pick === "ask";
                if (ask === aiModeRef.current) return;
                if (!ask) clearAsk();
                setAiMode(ask);
                editor.focus();
              }}
            >
              <Toggle
                value="filter"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
              >
                Filter
              </Toggle>
              <Toggle
                value="ask"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
              >
                Ask
              </Toggle>
            </ToggleGroup>
          </span>
        </Tooltip>
        {hasText || ask.active ? (
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="Clear search"
            className={styles.clear}
            onClick={clearField}
          >
            <Clear />
          </Button>
        ) : null}
        {onCollapse ? (
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="Close search"
            className={styles.close}
            onClick={onCollapse}
          >
            <IconXmarkOutline12 />
          </Button>
        ) : null}
      </div>
      {ask.active && ask.status === "error" ? (
        <div className={styles.status}>
          <Loader.Root>
            Couldn’t search
            <Button
              size="xs"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const q = ask.question.trim();
                if (q) void runNl(q);
              }}
            >
              Retry
            </Button>
          </Loader.Root>
        </div>
      ) : null}
      {showSuggestions ? (
        <div className={styles.suggestions}>
          {ask.suggestions.map((s) => (
            <Suggestion.Root
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAskSuggestion(s)}
            >
              {s.label}
              <Suggestion.Count>{s.count}</Suggestion.Count>
            </Suggestion.Root>
          ))}
        </div>
      ) : null}
    </div>
  );
}
