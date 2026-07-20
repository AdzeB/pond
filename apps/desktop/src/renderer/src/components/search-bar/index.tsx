import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { TrayCard } from "@pond/ui";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ESCAPE_COMMAND,
  LineBreakNode,
} from "lexical";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { parseSearchInput, serializeQuery } from "@/lib/search/syntax";
import { useViewFilteredCount } from "@/stores/library-view-context";
import { useTags } from "@/stores/tags";
import { setSearchInput, useFilterQuery } from "@/stores/view-store";
import { $isEditorEmpty, $readSearchString } from "./lib/editor-state";
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
  const dock = useDock();
  const tags = useTags();
  const _count = useViewFilteredCount();
  const [hasContent, setHasContent] = useState(false);
  const seededRef = useRef(false);

  const tagNames = useMemo(() => tags.map((t) => t.name), [tags]);

  /** Seed the editor once from the committed query as plain text; the token plugin highlights recognized tokens on the next transform pass. */
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
    /** Seeding happens on open only; later edits drive the query, not the reverse. */
  }, [editor, seedQuery]);

  /** Every edit re-parses the tokens and residual text into the view store, which the grid already reflects. */
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        setHasContent(!$isEditorEmpty());
        const parsed = parseSearchInput($readSearchString());
        setSearchInput(parsed.predicates, parsed.text);
      });
    });
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

  /** Single-line query: swallow Enter and flatten pasted newlines to spaces. */
  useEffect(() => {
    const unregisterBreak = editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      () => true,
      COMMAND_PRIORITY_LOW,
    );
    const unregisterParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => true,
      COMMAND_PRIORITY_LOW,
    );
    const unregisterTransform = editor.registerNodeTransform(
      LineBreakNode,
      (node) => {
        node.replace($createTextNode(" "));
      },
    );
    return () => {
      unregisterBreak();
      unregisterParagraph();
      unregisterTransform();
    };
  }, [editor]);

  return (
    <TrayCard.Root className={styles.card}>
      <TrayCard.Header>
        <TrayCard.Help onClick={() => dock.openViewMenu("search-help")} />
        <TrayCard.Title position="center">Search Library</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Results update live. Mix words with filters like source:twitter or
          tag:design.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.fields}>
        <div className={styles.editor}>
          <Search
            className={styles["lead-icon"]}
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
              <span className={styles.placeholder}>Filter your library…</span>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ClearEditorPlugin />
          {autoFocus ? <AutoFocusPlugin /> : null}
          <FilterTokenPlugin />
          <FilterTypeahead tags={tagNames} />
        </div>
      </div>
    </TrayCard.Root>
  );
}
