import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button, Loader } from "@pond/ui";
import {
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ESCAPE_COMMAND,
  LineBreakNode,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNlCompiler, useNlFacets } from "@/hooks/use-nl-query";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { flattenPredicates } from "@/lib/search/nl-query";
import { parseSearchInput, serializeQuery } from "@/lib/search/syntax";
import { useTags } from "@/stores/tags";
import {
  setSearchInput,
  useFilterQuery,
  useSearchInput,
  useSearchText,
} from "@/stores/view-store";
import { $readSearchString, $writeSearchString } from "./lib/editor-state";
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

function SearchField({ autoFocus = false, onCollapse }: ComposerProps) {
  const [editor] = useLexicalComposerContext();
  const tags = useTags();
  const facets = useNlFacets();
  const compile = useNlCompiler();
  const [status, setStatus] = useState<"idle" | "thinking" | "error">("idle");
  const seededRef = useRef(false);
  const compileRef = useRef(compile);
  compileRef.current = compile;
  const statusRef = useRef(status);
  statusRef.current = status;
  const runRef = useRef(0);
  const scrollFade = useScrollFade<HTMLDivElement>();

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
      $writeSearchString(serialized);
    });
  }, [editor, seedInput, seedQuery, seedText]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const raw = $readSearchString();
        const parsed = parseSearchInput(raw);
        setSearchInput(parsed.predicates, parsed.text, raw);
      });
    });
  }, [editor]);

  const onCollapseRef = useRef(onCollapse);
  onCollapseRef.current = onCollapse;

  const cancelAi = useCallback(() => {
    runRef.current += 1;
    setStatus("idle");
  }, []);

  const submitAi = async () => {
    if (statusRef.current === "thinking") return;
    let raw = "";
    editor.getEditorState().read(() => {
      raw = $readSearchString();
    });
    if (!raw) return;
    runRef.current += 1;
    const nonce = runRef.current;
    setStatus("thinking");
    try {
      const compiled = await compileRef.current(raw);
      if (runRef.current !== nonce) return;
      const query = compiled.plan.filter;
      const residual = compiled.residual.trim();
      const predicates = flattenPredicates(query);
      const serialized = [serializeQuery(query), residual]
        .filter(Boolean)
        .join(" ");
      setSearchInput(predicates, residual, serialized);
      editor.update(() => {
        $writeSearchString(serialized);
      });
      setStatus("idle");
    } catch {
      if (runRef.current !== nonce) return;
      setStatus("error");
    }
  };

  const submitAiRef = useRef(submitAi);
  submitAiRef.current = submitAi;

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (statusRef.current === "thinking") {
          cancelAi();
          return true;
        }
        onCollapseRef.current?.();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, cancelAi]);

  useEffect(() => {
    const submitOrSwallow = () => {
      void submitAiRef.current();
      return true;
    };
    const unregisterBreak = editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      submitOrSwallow,
      COMMAND_PRIORITY_LOW,
    );
    const unregisterParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      submitOrSwallow,
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

  const hasText = seedInput.trim().length > 0;

  const clearField = () => {
    cancelAi();
    setSearchInput([], "", "");
    editor.update(() => {
      $writeSearchString("");
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.editor}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={styles.input}
                spellCheck={false}
                ariaLabel="Search"
                {...scrollFade}
              />
            }
            placeholder={<span className={styles.placeholder}>Search…</span>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          {autoFocus ? <AutoFocusPlugin /> : null}
          <FilterTokenPlugin />
          <FilterTypeahead
            tags={tagNames}
            sources={facets.sources}
            creators={facets.creators}
          />
        </div>
        {hasText ? (
          <Button
            size="xs"
            variant="ghost"
            className={styles.clear}
            onClick={clearField}
          >
            Clear Search
          </Button>
        ) : null}
        {onCollapse ? (
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="Close Search"
            className={styles.close}
            onClick={onCollapse}
          >
            <IconXmarkOutline12 />
          </Button>
        ) : null}
      </div>
      {status === "error" ? (
        <div className={styles.status}>
          <Loader.Root>
            Couldn’t search
            <Button
              size="xs"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void submitAi()}
            >
              Retry
            </Button>
          </Loader.Root>
        </div>
      ) : null}
    </div>
  );
}
