import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { IconPen2Fill12 as NewChat } from "@pond/icons/fill/12";
import { TrayCard } from "@pond/ui";
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskMentions } from "@/components/ask/mentions";
import { useDock } from "@/components/library/dock/lib/context";
import { SkillDialog } from "@/components/shared/skill-dialog";
import { useSaves } from "@/hooks/use-saves";
import { clearAsk, useAskTurns } from "@/stores/ask-store";
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
  onSubmitted?: () => void;
  onClear?: () => void;
}

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

function AskField({
  autoFocus = false,
  onCollapse,
  onSubmitted,
  onClear,
}: ComposerProps) {
  const [editor] = useLexicalComposerContext();
  const dock = useDock();
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
      onSubmitted?.();
    }
  }, [
    editor,
    submit,
    onSubmitted,
    turns.length,
    pendingImage,
    setPendingImage,
  ]);

  /** Sends a literal string as a fresh conversation rather than a refinement. */
  const runText = useCallback(
    (text: string) => {
      if (submit(text, [], { refine: false })) onSubmitted?.();
    },
    [submit, onSubmitted],
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

  const newChat = useCallback(() => {
    if (onClear) onClear();
    else clearAsk();
    removePendingImage();
    queueMicrotask(() => editor.focus());
  }, [onClear, editor, removePendingImage]);

  return (
    <TrayCard.Root
      className={styles.card}
      data-chat={hasTurns || undefined}
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files"))
          e.preventDefault();
      }}
    >
      <TrayCard.Header>
        <TrayCard.Action
          position="start"
          aria-label="New chat"
          onClick={newChat}
        >
          <NewChat width={12} height={12} />
        </TrayCard.Action>
        <TrayCard.Title position="center">Chat</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        {!hasTurns ? (
          <TrayCard.Description>
            Answers come from your library. Use / for skills, @ for saves, # for
            tags.
          </TrayCard.Description>
        ) : null}
      </TrayCard.Header>

      {hasTurns ? (
        <Transcript turns={turns} busy={busy} onRetry={runText} />
      ) : null}

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
                {hasTurns
                  ? "Ask a follow-up"
                  : "Ask anything, / for skills, @ for context"}
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
          onHistory={() => dock.openViewMenu("ask-history")}
          onPickImage={onPickImage}
          canSend={canSend}
          onSend={sendNow}
        />
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
    </TrayCard.Root>
  );
}
