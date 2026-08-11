import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskMentions } from "@/components/ask/mentions";
import { SkillDialog } from "@/components/shared/skill-dialog";
import { useSaves } from "@/hooks/use-saves";
import { useAskTurns } from "@/stores/ask-store";
import { usePrefs } from "@/stores/prefs";
import { AttachRow } from "./attach-row";
import { ComposerToolbar } from "./lib/composer-toolbar";
import {
  $collectMentionIds,
  $isEditorEmpty,
  $readPrompt,
  $readSegments,
} from "./lib/editor-state";
import { MentionChipNode, SkillChipNode, TagChipNode } from "./lib/nodes";
import { useAskSubmit } from "./lib/use-ask-submit";
import { useStagedImage } from "./lib/use-staged-image";
import styles from "./styles.module.css";
import { Transcript } from "./transcript";

interface ComposerProps {
  autoFocus?: boolean;
  onCollapse?: () => void;
}

/** Conversation body + prompt input for the chat rail. */
export function AskComposer(props: ComposerProps) {
  const initialConfig = useMemo(
    () => ({
      namespace: "ask-composer",
      nodes: [SkillChipNode, MentionChipNode, TagChipNode],
      theme: { paragraph: styles.paragraph },
      onError: (error: Error) => {
        throw error;
      },
    }),
    [],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <AskField {...props} />
    </LexicalComposer>
  );
}

function AskField({ autoFocus = false, onCollapse }: ComposerProps) {
  const [editor] = useLexicalComposerContext();
  const saves = useSaves();
  const turns = useAskTurns();
  const [skillsPrefs] = usePrefs("skills");
  const skills = useMemo(() => skillsPrefs.custom ?? [], [skillsPrefs.custom]);

  const submit = useAskSubmit();
  const hasTurns = turns.length > 0;

  const [hasContent, setHasContent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  const {
    fileInputRef,
    pendingImage,
    setPendingImage,
    acceptImageFile,
    removePendingImage,
    onPickImage,
    onPaste,
    onDrop,
  } = useStagedImage();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        /** A lone @mention reads as empty text but is still sendable, so mention chips count as content. */
        setHasContent(!$isEditorEmpty() || $collectMentionIds().length > 0);
      });
    });
  }, [editor]);

  /** New chat from the rail header clears turns; refocus the empty prompt. */
  useEffect(() => {
    if (!hasTurns && autoFocus) queueMicrotask(() => editor.focus());
  }, [hasTurns, autoFocus, editor]);

  const sendNow = useCallback(() => {
    const state = editor.getEditorState();
    const prompt = state.read($readPrompt);
    const anchors = state.read($collectMentionIds);
    const segments = state.read($readSegments);
    /** A follow-up refines the current result set. */
    const refine = turns.length > 0;
    const image = pendingImage ?? undefined;
    if (submit(prompt, anchors, { refine, image, segments })) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      /** The turn now owns the object URL; drop our handle without revoking it. */
      setPendingImage(null);
    }
  }, [editor, submit, turns.length, pendingImage, setPendingImage]);

  /** Sends a literal string as a fresh conversation rather than a refinement. */
  const runText = useCallback(
    (text: string) => {
      submit(text, [], { refine: false });
    },
    [submit],
  );

  const openCreateSkill = useCallback((name: string) => {
    setCreateName(name);
    setCreateOpen(true);
  }, []);

  /** Refs let the command handlers read latest values without re-registering per keystroke.
   * @remarks The typeahead plugin intercepts enter/escape at higher priority while a menu is open, so these LOW handlers only run otherwise. */
  const sendRef = useRef(sendNow);
  const emptyRef = useRef(!hasContent);
  const onCollapseRef = useRef(onCollapse);
  sendRef.current = sendNow;
  emptyRef.current = !hasContent;
  onCollapseRef.current = onCollapse;

  useEffect(() => {
    const cleanups = [
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          event?.preventDefault();
          sendRef.current();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
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
      ),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [editor]);

  const lastTurn = turns[turns.length - 1] ?? null;
  const busy = lastTurn?.status === "thinking";
  const canSend = (hasContent || pendingImage != null) && !busy;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: paste/drop target for composer attachments
    <div
      className={styles.chat}
      data-chat={hasTurns || undefined}
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files"))
          e.preventDefault();
      }}
    >
      <div className={styles.conversation}>
        {hasTurns ? (
          <Transcript turns={turns} busy={busy} onRetry={runText} />
        ) : (
          <div className={styles.empty}>
            <p className={styles["empty-title"]}>
              Hi! How can I help you today?
            </p>
          </div>
        )}
      </div>

      <div className={styles.composer}>
        {pendingImage ? (
          <AttachRow image={pendingImage} onRemove={removePendingImage} />
        ) : null}

        <div className={styles.editor}>
          <div className={styles["editor-field"]}>
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  className={styles.input}
                  spellCheck={false}
                  ariaLabel="Ask anything, or use / @ #"
                />
              }
              placeholder={
                <span className={styles.placeholder}>
                  {hasTurns ? "Ask a follow-up" : "Ask anything"}
                </span>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ClearEditorPlugin />
            {autoFocus ? <AutoFocusPlugin /> : null}
            <AskMentions
              skills={skills}
              saves={saves}
              onCreateSkill={openCreateSkill}
            />
          </div>
          <ComposerToolbar
            onPickImage={onPickImage}
            canSend={canSend}
            onSend={sendNow}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) acceptImageFile(file);
          e.target.value = "";
        }}
      />

      <SkillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={createName}
      />
    </div>
  );
}
