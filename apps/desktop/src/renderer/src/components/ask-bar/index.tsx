import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
  IconArrowUpFill18 as ArrowUp,
  IconSparkleFill18 as Sparkle,
  IconCircleStopFill18 as Stop,
} from "@pond/icons/fill/18";
import {
  IconXmarkOutline18 as Clear,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import {
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SkillDialog } from "@/components/skill-dialog";
import { runAskSuggestion, useAsk } from "@/hooks/use-ask";
import { useSaves } from "@/hooks/use-saves";
import { formatNumber } from "@/lib/format";
import { bouncySpring } from "@/lib/motion";
import { type CustomSkill, matchSkills, slugifySkillName } from "@/lib/skills";
import type { Save } from "@/lib/types";
import { type AskStage, clearAsk, useAskResult } from "@/stores/ask-store";
import { usePrefs } from "@/stores/prefs";
import {
  $clearTrigger,
  $collectMentionIds,
  $isEditorEmpty,
  $readPrompt,
  $readTrigger,
  $replaceTriggerWithChip,
  $setPlainText,
  type AskTrigger,
} from "./editor-state";
import {
  $createMentionChipNode,
  $createSkillChipNode,
  $createTagChipNode,
  MentionChipNode,
  SkillChipNode,
  TagChipNode,
} from "./nodes";
import styles from "./styles.module.css";

// How many skills the "/" menu shows before a "Show N more" expander appears.
const GROUP_CAP = 5;
const LOOKUP_CAP = 8;

type AskMenuItem =
  | { kind: "skill"; key: string; skill: CustomSkill }
  | { kind: "create"; key: string; name: string }
  | { kind: "more"; key: string; count: number }
  | { kind: "save"; key: string; save: Save }
  | { kind: "tag"; key: string; tag: string; count: number };

interface AskMenuGroup {
  id: string;
  label: string;
  items: AskMenuItem[];
}

interface AskMenu {
  groups: AskMenuGroup[];
  flat: AskMenuItem[];
}

function tagCountsOf(saves: ReadonlyArray<Save>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const save of saves) {
    if (save.deletedAt) continue;
    for (const tag of save.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

function matchSaves(saves: ReadonlyArray<Save>, query: string): Save[] {
  const q = query.trim().toLowerCase();
  const live = saves.filter((s) => !s.deletedAt);
  if (!q) return live.slice(0, LOOKUP_CAP);
  return live
    .filter((s) =>
      [s.title, s.author, s.url].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    )
    .slice(0, LOOKUP_CAP);
}

function matchTagList(
  counts: Map<string, number>,
  query: string,
): { tag: string; count: number }[] {
  const q = query.trim().toLowerCase();
  const all = Array.from(counts, ([tag, count]) => ({ tag, count }));
  const filtered = q ? all.filter((t) => t.tag.toLowerCase().includes(q)) : all;
  filtered.sort((a, b) => {
    if (q) {
      const ap = a.tag.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.tag.toLowerCase().startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
    }
    return b.count - a.count || a.tag.localeCompare(b.tag);
  });
  return filtered.slice(0, LOOKUP_CAP);
}

// Build the grouped menu for the active trigger, or null when none is open.
function buildMenu(
  trigger: { trigger: AskTrigger; query: string } | null,
  ctx: {
    skills: ReadonlyArray<CustomSkill>;
    saves: ReadonlyArray<Save>;
    tagCounts: Map<string, number>;
    expandedSkills: boolean;
  },
): AskMenu | null {
  if (!trigger) return null;
  const { query } = trigger;

  if (trigger.trigger === "/") {
    const matched = matchSkills(ctx.skills, query);
    const visible = ctx.expandedSkills ? matched : matched.slice(0, GROUP_CAP);
    const items: AskMenuItem[] = visible.map((skill) => ({
      kind: "skill",
      key: `skill-${skill.id}`,
      skill,
    }));
    if (!ctx.expandedSkills && matched.length > GROUP_CAP) {
      items.push({
        kind: "more",
        key: "more",
        count: matched.length - GROUP_CAP,
      });
    }
    items.push({
      kind: "create",
      key: "create",
      name: slugifySkillName(query),
    });
    const groups: AskMenuGroup[] = [{ id: "skills", label: "Skills", items }];
    return { groups, flat: items };
  }

  if (trigger.trigger === "@") {
    const items: AskMenuItem[] = matchSaves(ctx.saves, query).map((save) => ({
      kind: "save",
      key: `save-${save.id}`,
      save,
    }));
    if (items.length === 0) return null;
    return { groups: [{ id: "saves", label: "Saves", items }], flat: items };
  }

  const items: AskMenuItem[] = matchTagList(ctx.tagCounts, query).map((t) => ({
    kind: "tag",
    key: `tag-${t.tag}`,
    tag: t.tag,
    count: t.count,
  }));
  if (items.length === 0) return null;
  return { groups: [{ id: "tags", label: "Tags", items }], flat: items };
}

// Trim + validate a question before running it, returning whether it ran.
function useAskSubmit() {
  const run = useAsk();
  return useCallback(
    (raw: string, anchors: string[] = []): boolean => {
      const text = raw.trim();
      if (!text && anchors.length === 0) return false;
      void run(text, anchors);
      return true;
    },
    [run],
  );
}

interface ComposerProps {
  autoFocus?: boolean;
  onCollapse?: () => void;
  onSubmitted?: () => void;
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
}: ComposerProps) {
  const [editor] = useLexicalComposerContext();
  const saves = useSaves();
  const [skillsPrefs] = usePrefs("skills");
  const skills = useMemo(() => skillsPrefs.custom ?? [], [skillsPrefs.custom]);
  const tagCounts = useMemo(() => tagCountsOf(saves), [saves]);

  const submit = useAskSubmit();

  const [trigger, setTrigger] = useState<{
    trigger: AskTrigger;
    query: string;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedSkills, setExpandedSkills] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  const menu = useMemo(
    () => buildMenu(trigger, { skills, saves, tagCounts, expandedSkills }),
    [trigger, skills, saves, tagCounts, expandedSkills],
  );
  const open = !dismissed && menu !== null && menu.flat.length > 0;
  const flat = menu?.flat ?? [];
  const activeItem = open
    ? (flat[Math.min(activeIndex, flat.length - 1)] ?? null)
    : null;

  // Mirror the editor's caret-trigger + emptiness into React state.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        setTrigger($readTrigger());
        // A lone @mention reads as empty text but is still sendable ("find
        // similar"), so count mention chips toward having content.
        setHasContent(!$isEditorEmpty() || $collectMentionIds().length > 0);
      });
    });
  }, [editor]);

  const triggerKey = trigger ? `${trigger.trigger}:${trigger.query}` : null;
  // Reset the highlight, dismissal, and skills expander as the trigger changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on trigger change
  useEffect(() => {
    setActiveIndex(0);
    setDismissed(false);
    setExpandedSkills(false);
  }, [triggerKey]);

  useEffect(() => {
    if (!autoFocus) return;
    const raf = requestAnimationFrame(() => editor.focus());
    return () => cancelAnimationFrame(raf);
  }, [autoFocus, editor]);

  const sendNow = useCallback(() => {
    const state = editor.getEditorState();
    const prompt = state.read($readPrompt);
    const anchors = state.read($collectMentionIds);
    if (submit(prompt, anchors)) {
      editor.update(() => $setPlainText(""));
      onSubmitted?.();
    }
  }, [editor, submit, onSubmitted]);

  const select = useCallback(
    (item: AskMenuItem) => {
      switch (item.kind) {
        case "skill":
          editor.update(() =>
            $replaceTriggerWithChip("/", () =>
              $createSkillChipNode(
                item.skill.id,
                item.skill.name,
                item.skill.prompt,
              ),
            ),
          );
          break;
        case "create":
          editor.update(() => $clearTrigger("/"));
          setCreateName(item.name);
          setCreateOpen(true);
          break;
        case "more":
          setExpandedSkills(true);
          return;
        case "save":
          editor.update(() =>
            $replaceTriggerWithChip("@", () =>
              $createMentionChipNode(
                item.save.id,
                item.save.title ?? "Untitled",
              ),
            ),
          );
          break;
        case "tag":
          editor.update(() =>
            $replaceTriggerWithChip("#", () => $createTagChipNode(item.tag)),
          );
          break;
      }
      queueMicrotask(() => editor.focus());
    },
    [editor],
  );

  // Refs let the Lexical command handlers read the latest menu state without
  // re-registering on every keystroke.
  const openRef = useRef(open);
  const activeIndexRef = useRef(activeIndex);
  const flatRef = useRef(flat);
  const selectRef = useRef(select);
  const sendRef = useRef(sendNow);
  const emptyRef = useRef(!hasContent);
  const onCollapseRef = useRef(onCollapse);
  openRef.current = open;
  activeIndexRef.current = activeIndex;
  flatRef.current = flat;
  selectRef.current = select;
  sendRef.current = sendNow;
  emptyRef.current = !hasContent;
  onCollapseRef.current = onCollapse;

  useEffect(() => {
    const cleanups = [
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (!openRef.current) return false;
          event?.preventDefault();
          const count = flatRef.current.length;
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
          const count = flatRef.current.length;
          if (count > 0) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          event?.preventDefault();
          const idx = activeIndexRef.current;
          const items = flatRef.current;
          if (openRef.current && idx >= 0 && idx < items.length) {
            const item = items[idx];
            if (item) selectRef.current(item);
            return true;
          }
          sendRef.current();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          const idx = activeIndexRef.current;
          const items = flatRef.current;
          if (openRef.current && idx >= 0 && idx < items.length) {
            const item = items[idx];
            if (item) {
              event?.preventDefault();
              selectRef.current(item);
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (openRef.current) {
            setDismissed(true);
            setActiveIndex(0);
          } else if (emptyRef.current) {
            onCollapseRef.current?.();
          } else {
            editor.update(() => $setPlainText(""));
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

  const titleLabel = trigger
    ? trigger.trigger === "/"
      ? "Skills"
      : trigger.trigger === "@"
        ? "Saves"
        : "Tags"
    : "Ask";

  return (
    <motion.div layout className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Sparkle width={14} height={14} />
          {titleLabel}
        </span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Close"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onCollapse?.()}
          >
            <Clear width={15} height={15} />
          </button>
        </div>
      </div>

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
              Ask anything, or / for skills…
            </span>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
      </div>

      {open && menu ? (
        <motion.div
          className={styles.menu}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={bouncySpring}
        >
          {menu.groups.map((group) => (
            <div key={group.id} className={styles.menuGroup}>
              <div className={styles.menuGroupLabel}>{group.label}</div>
              {group.items.map((item) => {
                const index = flat.indexOf(item);
                return (
                  <AskMenuRow
                    key={item.key}
                    item={item}
                    active={item === activeItem}
                    onHover={() => setActiveIndex(index)}
                    onSelect={() => select(item)}
                  />
                );
              })}
            </div>
          ))}
        </motion.div>
      ) : null}

      <div className={styles.footer}>
        <kbd className={styles.kbd}>
          {open ? "↑↓ to choose · ⏎ to insert" : "⏎ to ask · / @ # to add"}
        </kbd>
        <button
          type="button"
          className={styles.primary}
          aria-label="Ask"
          disabled={!hasContent}
          onMouseDown={(e) => e.preventDefault()}
          onClick={sendNow}
        >
          <ArrowUp width={16} height={16} />
        </button>
      </div>

      <SkillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={createName}
      />
    </motion.div>
  );
}

function AskMenuRow({
  item,
  active,
  onHover,
  onSelect,
}: {
  item: AskMenuItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const common = {
    type: "button" as const,
    "data-active": active || undefined,
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onMouseEnter: onHover,
    onClick: onSelect,
  };

  if (item.kind === "more") {
    return (
      <button className={styles.menuMore} {...common}>
        Show {item.count} more
      </button>
    );
  }

  if (item.kind === "create") {
    return (
      <button className={styles.menuCreate} {...common}>
        <Plus width={14} height={14} />
        {item.name ? `Create skill “/${item.name}”` : "Create skill…"}
      </button>
    );
  }

  const name =
    item.kind === "skill"
      ? `/${item.skill.name}`
      : item.kind === "tag"
        ? `#${item.tag}`
        : (item.save.title ?? "Untitled");
  const description =
    item.kind === "skill"
      ? item.skill.description || item.skill.prompt
      : item.kind === "tag"
        ? `${item.count} ${item.count === 1 ? "item" : "items"}`
        : [item.save.source, item.save.author].filter(Boolean).join(" · ");

  return (
    <button className={styles.menuRow} {...common}>
      <span className={styles.menuName}>{name}</span>
      <span className={styles.menuDesc}>{description}</span>
    </button>
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
