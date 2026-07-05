import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { IconChevronDownFill18 as Collapse } from "@pond/icons/fill/18";
import {
  IconXmarkOutline18 as Clear,
  IconMagnifierOutline18 as Search,
} from "@pond/icons/outline/18";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseSearchInput, serializeQuery } from "@/lib/search/syntax";
import { formatNumber } from "@/lib/util/format";
import { useViewFilteredCount } from "@/stores/library-view-context";
import { useTags } from "@/stores/tags";
import { setSearchInput, useFilterQuery } from "@/stores/view-store";
import { $isEditorEmpty, $readSearchString } from "./lib/editor-state";
import { FiltersMenu } from "./lib/filters-menu";
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

function SearchField({ autoFocus = false, onCollapse }: ComposerProps) {
  const [editor] = useLexicalComposerContext();
  const tags = useTags();
  const count = useViewFilteredCount();
  const [hasContent, setHasContent] = useState(false);
  const seededRef = useRef(false);

  const tagNames = useMemo(() => tags.map((t) => t.name), [tags]);

  // Seed the editor once from the committed query as plain text; the token
  // entity plugin highlights the recognized tokens on the next transform pass.
  const seedQuery = useFilterQuery();
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const serialized = serializeQuery(seedQuery);
    if (!serialized.trim()) return;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(`${serialized} `));
      root.append(paragraph);
      paragraph.selectEnd();
    });
    // Seeding on open only; later edits drive the query, not the reverse.
  }, [editor, seedQuery]);

  // Commit filters live: every edit re-parses the assembled tokens + residual
  // text and pushes them into the view store, which the grid already reflects.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        setHasContent(!$isEditorEmpty());
        const parsed = parseSearchInput($readSearchString());
        setSearchInput(parsed.predicates, parsed.text);
      });
    });
  }, [editor]);

  const clearAll = useCallback(() => {
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    queueMicrotask(() => editor.focus());
  }, [editor]);

  const onCollapseRef = useRef(onCollapse);
  const emptyRef = useRef(!hasContent);
  onCollapseRef.current = onCollapse;
  emptyRef.current = !hasContent;

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (emptyRef.current) {
          onCollapseRef.current?.();
        } else {
          editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return (
    // No `layout` here: the dock pill owns the size morph. An inner `layout`
    // projects from a stale origin inside the pill's popLayout crossfade,
    // producing a scale/translate slide-in artifact.
    <motion.div className={styles.card}>
      <div className={styles.editor}>
        <Search
          className={styles.leadIcon}
          width={16}
          height={16}
          aria-hidden
        />
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={styles.input}
              spellCheck={false}
              ariaLabel="Search filters"
            />
          }
          placeholder={
            <span className={styles.placeholder}>
              Filter by source:twitter, tag:design, saved:past-week…
            </span>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ClearEditorPlugin />
        {autoFocus ? <AutoFocusPlugin /> : null}
        <FilterTokenPlugin />
        <FilterTypeahead tags={tagNames} />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Collapse"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onCollapse?.()}
          >
            <Collapse width={16} height={16} />
          </button>
          <FiltersMenu />
        </div>

        <div className={styles.toolbarGroup}>
          <span className={styles.count}>
            {formatNumber(count)} {count === 1 ? "result" : "results"}
          </span>
          {hasContent ? (
            <button
              type="button"
              className={styles.clearBtn}
              aria-label="Clear filters"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearAll}
            >
              <Clear width={14} height={14} />
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
