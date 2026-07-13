import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
  IconPenSparkleFill18 as NewChat,
  IconSparkle3Fill18 as Sparkle,
} from "@pond/icons/fill/18";
import { IconXmarkOutline18 as Clear } from "@pond/icons/outline/18";
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskMentions } from "@/components/ask-bar-mentions";
import { PromptDialog } from "@/components/prompt-dialog";
import { SkillDialog } from "@/components/skill-dialog";
import { useSaves } from "@/hooks/use-saves";
import { useAskHistory } from "@/stores/ask-history";
import { clearAsk, useAskTurns } from "@/stores/ask-store";
import { usePrefs } from "@/stores/prefs";
import { primarySelection } from "@/stores/selection";
import { ComposerToolbar } from "./lib/composer-toolbar";
import {
  $collectMentionIds,
  $isEditorEmpty,
  $readPrompt,
  $readSegments,
} from "./lib/editor-state";
import { MentionChipNode, SkillChipNode, TagChipNode } from "./lib/nodes";
import { TurnView } from "./lib/turn-view";
import { useAskSubmit } from "./lib/use-ask-submit";
import { useStagedImage } from "./lib/use-staged-image";
import { useStickyScroll } from "./lib/use-sticky-scroll";
import { useTurnActions } from "./lib/use-turn-actions";
import styles from "./styles.module.css";

export { AskStatusPill } from "./lib/status-pill";

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
  const saves = useSaves();
  const turns = useAskTurns();
  const recents = useAskHistory();
  const [skillsPrefs] = usePrefs("skills");
  const skills = useMemo(() => skillsPrefs.custom ?? [], [skillsPrefs.custom]);

  const submit = useAskSubmit();
  const hasTurns = turns.length > 0;

  const [hasContent, setHasContent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const {
    viewOpen,
    setViewOpen,
    viewName,
    setViewName,
    selectInGrid,
    openTagMenu,
    trashCurrent,
    openSaveView,
    confirmSaveView,
  } = useTurnActions(turns);

  const { scrollRef, onScroll: onTranscriptScroll } = useStickyScroll(turns);

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

  const openSave = useCallback((id: string) => primarySelection.set(id), []);

  const replayAsk = useCallback(
    (question: string) => {
      setHistoryOpen(false);
      runText(question);
    },
    [runText],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: paste/drop targets for image attachments, not click interactivity; the editor inside stays keyboard-accessible.
    <div
      className={styles.card}
      data-chat={hasTurns || undefined}
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files"))
          e.preventDefault();
      }}
    >
      {hasTurns ? (
        <div className={styles["chat-header"]}>
          <span className={styles["chat-title"]}>
            <Sparkle width={13} height={13} />
            Chat
          </span>
          <button
            type="button"
            className={styles["chat-new"]}
            aria-label="New chat"
            onMouseDown={(e) => e.preventDefault()}
            onClick={newChat}
          >
            <NewChat width={14} height={14} />
            New
          </button>
        </div>
      ) : null}

      {hasTurns ? (
        <div
          className={styles.transcript}
          ref={scrollRef}
          onScroll={onTranscriptScroll}
        >
          {turns.map((turn, i) => (
            <TurnView
              key={turn.id}
              turn={turn}
              isLast={i === turns.length - 1}
              onOpenSave={openSave}
              onRetry={
                i === turns.length - 1 &&
                turn.status === "error" &&
                turn.question
                  ? () => runText(turn.question)
                  : undefined
              }
              actions={
                i === turns.length - 1 &&
                turn.status === "done" &&
                turn.count > 0
                  ? {
                      onSelect: selectInGrid,
                      onTag: openTagMenu,
                      onTrash: trashCurrent,
                      onSaveView: openSaveView,
                    }
                  : null
              }
            />
          ))}
        </div>
      ) : null}

      {pendingImage ? (
        <div className={styles["attach-row"]}>
          <span className={styles["attach-thumb"]}>
            <img src={pendingImage.url} alt="" />
          </span>
          <span className={styles["attach-label"]}>{pendingImage.name}</span>
          <button
            type="button"
            className={styles["attach-remove"]}
            aria-label="Remove image"
            onMouseDown={(e) => e.preventDefault()}
            onClick={removePendingImage}
          >
            <Clear width={13} height={13} />
          </button>
        </div>
      ) : null}

      <div className={styles.editor}>
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
                ? "Ask a follow-up, or drop an image…"
                : "Ask anything, / for skills, @ for context…"}
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
        onCollapse={onCollapse}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
        recents={recents}
        onReplay={replayAsk}
        onPickImage={onPickImage}
        canSend={canSend}
        onSend={sendNow}
      />

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

      <PromptDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Save as view"
        description="Name this result set to pin it as a saved view."
        value={viewName}
        onValueChange={setViewName}
        onConfirm={confirmSaveView}
        confirmLabel="Save view"
        placeholder="View name"
      />
    </div>
  );
}
