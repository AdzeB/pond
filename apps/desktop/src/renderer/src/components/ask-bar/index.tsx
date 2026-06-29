import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
  IconArrowUpFill18 as ArrowUp,
  IconChevronDownFill18 as Collapse,
  IconImagePlusFill18 as ImagePlus,
  IconPenSparkleFill18 as NewChat,
  IconSparkleFill18 as Sparkle,
  IconCircleStopFill18 as Stop,
} from "@pond/icons/fill/18";
import {
  IconAtSignOutline18 as AtSign,
  IconXmarkOutline18 as Clear,
  IconClockRotateClockwiseOutline18 as History,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import { Popover } from "@pond/ui";
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskMentions } from "@/components/ask-bar-mentions";
import { PromptDialog } from "@/components/prompt-dialog";
import { SkillDialog } from "@/components/skill-dialog";
import { runAskSuggestion, useAsk } from "@/hooks/use-ask";
import { useSaves } from "@/hooks/use-saves";
import { representativeImageUrl } from "@/lib/enrichment/image";
import { addTagToSelection, trashSelection } from "@/lib/save/selection";
import { bouncySpring } from "@/lib/ui/motion";
import { showContextMenu } from "@/lib/ui/native-menu";
import { formatNumber } from "@/lib/util/format";
import { useAskHistory } from "@/stores/ask-history";
import {
  type AskSegment,
  type AskStage,
  type AskTurn,
  askSnapshot,
  clearAsk,
  useAskResult,
  useAskTurns,
} from "@/stores/ask-store";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { presentation } from "@/stores/presentation";
import { selection } from "@/stores/selection";
import { useTags } from "@/stores/tags";
import { pushToast } from "@/stores/toasts";
import {
  $collectMentionIds,
  $insertTrigger,
  $isEditorEmpty,
  $readPrompt,
  $readSegments,
  type AskTrigger,
} from "./lib/editor-state";
import { MentionChipNode, SkillChipNode, TagChipNode } from "./lib/nodes";
import styles from "./styles.module.css";

// A query image staged in the composer before it's sent. `blob` feeds CLIP;
// `url` is an object URL shown as a thumbnail and handed to the resolved turn.
interface PendingImage {
  blob: Blob;
  url: string;
  name: string;
}

// Trim + validate a question before running it, returning whether it ran.
function useAskSubmit() {
  const run = useAsk();
  return useCallback(
    (
      raw: string,
      anchors: string[] = [],
      opts: {
        refine?: boolean;
        image?: PendingImage;
        segments?: ReadonlyArray<AskSegment>;
      } = {},
    ): boolean => {
      const text = raw.trim();
      if (!text && anchors.length === 0 && !opts.image) return false;
      void run(text, anchors, {
        refine: opts.refine,
        segments: opts.segments,
        image: opts.image
          ? {
              blob: opts.image.blob,
              meta: { url: opts.image.url, name: opts.image.name },
            }
          : undefined,
      });
      return true;
    },
    [run],
  );
}

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
  const tags = useTags();
  const [skillsPrefs] = usePrefs("skills");
  const skills = useMemo(() => skillsPrefs.custom ?? [], [skillsPrefs.custom]);

  const submit = useAskSubmit();
  const hasTurns = turns.length > 0;

  const [hasContent, setHasContent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  // Staged query image (image-to-image visual search), before send.
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  // "Save as view" prompt state, seeded from the latest turn's question.
  const [viewOpen, setViewOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Auto-scroll bookkeeping: only follow new content when the user is already
  // pinned to the bottom, but always jump on a brand-new turn.
  const stickRef = useRef(true);
  const prevLenRef = useRef(0);
  // Mirror of the staged image so an unmount (dock collapse) can revoke an
  // unsent object URL without revoking one already handed to a turn.
  const pendingRef = useRef<PendingImage | null>(null);
  pendingRef.current = pendingImage;

  // Mirror the editor's emptiness into React state.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        // A lone @mention reads as empty text but is still sendable ("find
        // similar"), so count mention chips toward having content.
        setHasContent(!$isEditorEmpty() || $collectMentionIds().length > 0);
      });
    });
  }, [editor]);

  const sendNow = useCallback(() => {
    const state = editor.getEditorState();
    const prompt = state.read($readPrompt);
    const anchors = state.read($collectMentionIds);
    const segments = state.read($readSegments);
    // A follow-up (any turn already exists) refines the current result set.
    const refine = turns.length > 0;
    const image = pendingImage ?? undefined;
    if (submit(prompt, anchors, { refine, image, segments })) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      // The turn now owns the object URL; drop our handle without revoking it.
      setPendingImage(null);
      onSubmitted?.();
    }
  }, [editor, submit, onSubmitted, turns.length, pendingImage]);

  // Send a literal string (starter chips / recent questions). Starts a fresh
  // conversation rather than refining.
  const runText = useCallback(
    (text: string) => {
      if (submit(text, [], { refine: false })) onSubmitted?.();
    },
    [submit, onSubmitted],
  );

  // Stage an image file for the next send (file picker / paste / drop).
  const acceptImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPendingImage((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {
          /* already revoked */
        }
      }
      return {
        blob: file,
        url: URL.createObjectURL(file),
        name: file.name || "image",
      };
    });
  }, []);

  const removePendingImage = useCallback(() => {
    setPendingImage((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {
          /* already revoked */
        }
      }
      return null;
    });
  }, []);

  const onPickImage = useCallback(() => fileInputRef.current?.click(), []);

  const onPaste = useCallback(
    (event: React.ClipboardEvent) => {
      const file = Array.from(event.clipboardData.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        event.preventDefault();
        acceptImageFile(file);
      }
    },
    [acceptImageFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const file = Array.from(event.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        event.preventDefault();
        acceptImageFile(file);
      }
    },
    [acceptImageFile],
  );

  // Conversational actions operate on the latest turn's result ids.
  const currentIds = turns[turns.length - 1]?.ids ?? null;
  const selectInGrid = useCallback(() => {
    if (!currentIds || currentIds.length === 0) return;
    selection.set([...currentIds]);
    pushToast(`Selected ${formatNumber(currentIds.length)} in grid.`);
  }, [currentIds]);

  const openTagMenu = useCallback(() => {
    if (!currentIds || currentIds.length === 0) return;
    const scope = [...currentIds];
    const items =
      tags.length === 0
        ? [{ label: "No tags yet", enabled: false }]
        : tags.map((tag) => ({
            label: tag.name,
            onSelect: () => void addTagToSelection(scope, tag.name),
          }));
    void showContextMenu([
      { label: `Tag ${formatNumber(scope.length)} results`, enabled: false },
      { type: "separator" },
      ...items,
    ]);
  }, [currentIds, tags]);

  const trashCurrent = useCallback(() => {
    if (!currentIds || currentIds.length === 0) return;
    void trashSelection([...currentIds]);
  }, [currentIds]);

  const openSaveView = useCallback(() => {
    setViewName(askSnapshot().question);
    setViewOpen(true);
  }, []);

  const confirmSaveView = useCallback(() => {
    const name = viewName.trim();
    if (!name) return;
    const snap = askSnapshot();
    void window.pond
      .query("savedViews.create", {
        name,
        question: snap.question,
        query: snap.query,
      })
      .then(() => pushToast(`Saved view “${name}”.`, "success"))
      .catch(() => pushToast("Couldn't save view.", "error"));
    setViewOpen(false);
  }, [viewName]);

  // Track whether the user is parked at the bottom so streaming updates don't
  // yank them away while they're scrolled up reading earlier turns.
  const onTranscriptScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

  // A new turn always scrolls into view; content updates (stage/summary) only
  // follow when already pinned to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = turns.length > prevLenRef.current;
    prevLenRef.current = turns.length;
    if (grew || stickRef.current) {
      el.scrollTop = el.scrollHeight;
      stickRef.current = true;
    }
  }, [turns]);

  // Revoke a staged-but-unsent image URL if the composer unmounts (e.g. the
  // dock collapses). A sent image is already null here, so its turn keeps it.
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        try {
          URL.revokeObjectURL(pendingRef.current.url);
        } catch {
          /* already revoked */
        }
      }
    };
  }, []);

  // Toolbar quick-add: drop a trigger char and refocus so its menu opens.
  const insertTrigger = useCallback(
    (trigger: AskTrigger) => {
      editor.update(() => $insertTrigger(trigger));
      queueMicrotask(() => editor.focus());
    },
    [editor],
  );

  // Open the "create skill" dialog seeded with a slug (from the `/` menu).
  const openCreateSkill = useCallback((name: string) => {
    setCreateName(name);
    setCreateOpen(true);
  }, []);

  // Refs let the command handlers read the latest values without re-registering
  // on every keystroke. The typeahead plugin intercepts enter/escape at a higher
  // priority while a menu is open, so these LOW handlers only run otherwise.
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

  const openSave = useCallback((id: string) => presentation.open(id), []);

  const replayAsk = useCallback(
    (question: string) => {
      setHistoryOpen(false);
      runText(question);
    },
    [runText],
  );

  return (
    <motion.div
      layout
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
        <div className={styles.chatHead}>
          <span className={styles.chatTitle}>
            <Sparkle width={13} height={13} />
            Chat
          </span>
          <button
            type="button"
            className={styles.chatNew}
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
        <div className={styles.attachRow}>
          <span className={styles.attachThumb}>
            <img src={pendingImage.url} alt="" />
          </span>
          <span className={styles.attachLabel}>{pendingImage.name}</span>
          <button
            type="button"
            className={styles.attachRemove}
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
          <Popover.Root open={historyOpen} onOpenChange={setHistoryOpen}>
            <Popover.Trigger
              className={styles.iconBtn}
              aria-label="Recent asks"
            >
              <History width={16} height={16} />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="top" align="start" sideOffset={8}>
                <Popover.Popup className={styles.historyPopup}>
                  <div className={styles.historyLabel}>Recent</div>
                  {recents.length === 0 ? (
                    <div className={styles.historyEmpty}>
                      No recent asks yet
                    </div>
                  ) : (
                    recents.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={styles.historyItem}
                        onClick={() => replayAsk(q)}
                      >
                        {q}
                      </button>
                    ))
                  )}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Attach image"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onPickImage}
          >
            <ImagePlus width={16} height={16} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Add context"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertTrigger("@")}
          >
            <AtSign width={16} height={16} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Add skill"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertTrigger("/")}
          >
            <Plus width={16} height={16} />
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.primary}
            aria-label="Ask"
            disabled={!canSend}
            onMouseDown={(e) => e.preventDefault()}
            onClick={sendNow}
          >
            <ArrowUp width={16} height={16} />
          </button>
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
    </motion.div>
  );
}

// How many result thumbnails to show inline under an assistant turn.
const MAX_THUMBS = 6;

interface TurnActionHandlers {
  onSelect: () => void;
  onTag: () => void;
  onTrash: () => void;
  onSaveView: () => void;
}

// Render one piece of the sent message: free text inline, or a chip styled to
// match how it looked in the composer (mention `@`, tag `#`, skill `/`).
function TurnSegment({ segment }: { segment: AskSegment }) {
  if (segment.kind === "text") return <>{segment.text}</>;
  const label =
    segment.kind === "mention"
      ? `@${segment.title}`
      : segment.kind === "tag"
        ? `#${segment.tag}`
        : `/${segment.name}`;
  return (
    <span className={styles.userChip} data-kind={segment.kind}>
      {label}
    </span>
  );
}

// One conversation exchange: the user's question (+ optional image) above the
// assistant's status, prose summary, inline result thumbnails, and — on the
// latest turn — actions on the result set.
function TurnView({
  turn,
  isLast,
  onOpenSave,
  onRetry,
  actions,
}: {
  turn: AskTurn;
  isLast: boolean;
  onOpenSave: (id: string) => void;
  onRetry?: () => void;
  actions: TurnActionHandlers | null;
}) {
  const reduceMotion = useReducedMotion();
  const busy = turn.status === "thinking" || turn.summaryStatus === "loading";
  const stageLabel = turn.stage ? STAGE_LABELS[turn.stage] : "Thinking…";
  const hasSummary = turn.summaryStatus === "done" && turn.summary.length > 0;
  const showSuggestions =
    turn.status === "done" && turn.count === 0 && turn.suggestions.length > 0;

  const labelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div className={styles.turn}>
      <div className={styles.userMsg}>
        {turn.image ? (
          <img className={styles.userImg} src={turn.image.url} alt="" />
        ) : null}
        {turn.segments.length > 0 ? (
          <span className={styles.userText}>
            {turn.segments.map((seg, i) => (
              // Segments are a fixed, ordered snapshot of the sent message; the
              // index is a stable identity here.
              // biome-ignore lint/suspicious/noArrayIndexKey: positional segments
              <TurnSegment key={`${seg.kind}-${i}`} segment={seg} />
            ))}
          </span>
        ) : turn.question ? (
          <span className={styles.userText}>{turn.question}</span>
        ) : null}
      </div>

      <div className={styles.assistantMsg}>
        <div className={styles.turnStatus}>
          {busy ? (
            <span className={styles.statusLine} role="status">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={stageLabel}
                  {...labelMotion}
                  transition={bouncySpring}
                >
                  {stageLabel}
                </motion.span>
              </AnimatePresence>
            </span>
          ) : turn.status === "error" ? (
            <span className={styles.statusLine}>
              Couldn’t search
              {onRetry ? (
                <button
                  type="button"
                  className={styles.retry}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onRetry}
                >
                  Retry
                </button>
              ) : null}
            </span>
          ) : turn.count === 0 ? (
            <span className={styles.statusLine}>No matches</span>
          ) : (
            <span className={styles.statusLine}>
              <span className={styles.count}>{formatNumber(turn.count)}</span>
              <span className={styles.resultLabel}>found</span>
            </span>
          )}
        </div>

        {hasSummary ? <p className={styles.turnBody}>{turn.summary}</p> : null}

        {turn.status === "done" && turn.count > 0 ? (
          <TurnResults ids={turn.ids} onOpenSave={onOpenSave} />
        ) : null}

        {showSuggestions ? (
          <div className={styles.suggestions}>
            {turn.suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.suggestion}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runAskSuggestion(s)}
              >
                {s.label}
                <span className={styles.suggestionCount}>{s.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isLast && actions ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onSelect}
            >
              Select
            </button>
            <button
              type="button"
              className={styles.action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onTag}
            >
              Tag…
            </button>
            <button
              type="button"
              className={styles.action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onSaveView}
            >
              Save as view
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.actionDanger}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onTrash}
            >
              Trash
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Inline thumbnail strip of the top matches for a resolved turn.
function TurnResults({
  ids,
  onOpenSave,
}: {
  ids: ReadonlyArray<string>;
  onOpenSave: (id: string) => void;
}) {
  const items = useMemo(() => {
    const out: { id: string; url: string | null }[] = [];
    for (const id of ids.slice(0, MAX_THUMBS)) {
      const save = pool.get(id);
      if (!save) continue;
      out.push({ id, url: representativeImageUrl(save) });
    }
    return out;
  }, [ids]);

  if (items.length === 0) return null;
  const more = ids.length - items.length;

  return (
    <div className={styles.thumbs}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={styles.thumb}
          aria-label="Open save"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onOpenSave(it.id)}
        >
          {it.url ? (
            <img src={it.url} alt="" />
          ) : (
            <span className={styles.thumbBlank} />
          )}
        </button>
      ))}
      {more > 0 ? (
        <span className={styles.thumbMore}>+{formatNumber(more)}</span>
      ) : null}
    </div>
  );
}

// Human phrasing for each live pipeline stage — the rotating narration that
// mirrors the reference's "Reading…/Determining…/Making changes…".
const STAGE_LABELS: Record<NonNullable<AskStage>, string> = {
  compiling: "Understanding your question…",
  searching: "Searching your library…",
  ranking: "Ranking matches…",
  summarizing: "Summarizing results…",
};

interface StatusPillProps {
  onReopen?: () => void;
  onClear?: () => void;
}

// The collapsed status pill: shows the agent thinking (with a shimmer) and then
// the result count, inline at the bottom. When a run finds nothing it offers
// one-tap relaxations; when it finds something it offers actions on the set.
export function AskStatusPill({ onReopen, onClear }: StatusPillProps) {
  const ask = useAskResult();
  const reduceMotion = useReducedMotion();
  const thinking = ask.status === "thinking";
  const done = ask.status === "done";
  // Busy spans the whole pipeline, including the post-search summary pass, so
  // the narration keeps animating until the prose is ready.
  const busy = thinking || ask.summaryStatus === "loading";
  const stageLabel = ask.stage ? STAGE_LABELS[ask.stage] : "Thinking…";
  const hasSummary = ask.summaryStatus === "done" && ask.summary.length > 0;
  const detail = hasSummary ? ask.summary : ask.question;
  const showSuggestions = done && ask.count === 0 && ask.suggestions.length > 0;

  const labelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div className={styles.statusPill}>
      <button
        type="button"
        className={styles.avatarBtn}
        aria-label="Ask again"
        onClick={() => onReopen?.()}
      >
        <Sparkle width={16} height={16} />
      </button>

      <span className={styles.statusText}>
        {busy ? (
          <span className={styles.label} role="status">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={stageLabel}
                {...labelMotion}
                transition={bouncySpring}
              >
                {stageLabel}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : ask.status === "error" ? (
          <span className={styles.label}>Couldn’t search</span>
        ) : ask.count === 0 ? (
          <span className={styles.label}>No matches</span>
        ) : (
          <>
            <motion.span
              key={ask.count}
              className={styles.count}
              initial={reduceMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={bouncySpring}
            >
              {formatNumber(ask.count)}
            </motion.span>
            <span className={styles.label}>found</span>
          </>
        )}
        {!busy && !showSuggestions && detail ? (
          <>
            <span className={styles.sep} aria-hidden>
              ·
            </span>
            <span className={styles.q}>{detail}</span>
          </>
        ) : null}
      </span>

      {showSuggestions ? (
        <span className={styles.suggestions}>
          {ask.suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.suggestion}
              onClick={() => runAskSuggestion(s)}
            >
              {s.label}
              <span className={styles.suggestionCount}>{s.count}</span>
            </button>
          ))}
        </span>
      ) : null}

      <button
        type="button"
        className={styles.endBtn}
        aria-label={busy ? "Stop" : "Clear results"}
        onClick={() => (busy ? clearAsk() : onClear?.())}
      >
        {busy ? (
          <Stop width={16} height={16} />
        ) : (
          <Clear width={14} height={14} />
        )}
      </button>
    </div>
  );
}
