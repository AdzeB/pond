import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import { IconChevronLeftOutline12 } from "@pond/icons/outline/12";
import {
  IconFileOutline18,
  IconGridLayoutRowsOutline18,
  IconLink2Outline18,
  IconPlusOutline18,
  IconTagsOutline18,
} from "@pond/icons/outline/18";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  themeCssVars,
} from "@pond/schema/db";
import { Button, Logo, Tooltip } from "@pond/ui";
import type {
  AssistantChange,
  AssistantQuestion,
  AssistantSource,
  AssistantToolStep,
} from "@shared/assistant";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AddMenu } from "@/features/agent/components/pane/add-menu";
import { AssistantResponse } from "@/features/agent/components/pane/assistant-response";
import { ChatHeader } from "@/features/agent/components/pane/chat-header";
import { Attachments } from "@/features/agent/components/pane/context";
import agentStyles from "@/features/agent/components/pane/pane.module.css";
import { Question } from "@/features/agent/components/pane/question";
import { ReferenceBoard } from "@/features/agent/components/pane/reference-board";
import { ResultSet } from "@/features/agent/components/pane/result-set";
import { ChangeReview } from "@/features/agent/components/pane/review";
import { ToolActivity } from "@/features/agent/components/pane/tool-activity";
import { useSaves } from "@/features/saves/hooks/use-saves";
import styles from "./assistant.module.css";

const FALLBACK_SOURCES: AssistantSource[] = [
  {
    id: "assistant-lab-1",
    title: "A calm interface for a personal archive",
    source: "are.na",
    url: "https://www.are.na/",
    description:
      "A restrained research interface using compact typography, soft borders, and visual references.",
  },
  {
    id: "assistant-lab-2",
    title: "Tools should disappear into the work",
    source: "cosmos",
    url: "https://www.cosmos.so/",
    description:
      "A visual note about keeping controls quiet until they become useful.",
  },
  {
    id: "assistant-lab-3",
    title: "Inline citations for conversational research",
    source: "web",
    url: "https://example.com/citations",
    description:
      "An example of references placed directly beside the claim they support.",
  },
  {
    id: "assistant-lab-4",
    title: "Designing with information density",
    source: "article",
    url: "https://example.com/density",
    description:
      "A compact layout can still feel calm when hierarchy and spacing are consistent.",
  },
  {
    id: "assistant-lab-5",
    title: "Agent interfaces as visible workspaces",
    source: "notes",
    url: "https://example.com/agents",
    description:
      "Progress, sources, and decisions appear as parts of the answer instead of raw logs.",
  },
  {
    id: "assistant-lab-6",
    title: "A reference board for collected images",
    source: "pinterest",
    url: "https://www.pinterest.com/",
    description:
      "A simple visual grid that keeps the source material near the conversation.",
  },
];

const STEPS: AssistantToolStep[] = [
  {
    id: "search",
    label: "Searched your library",
    detail: "visual research interfaces",
    status: "complete",
    elapsedMs: 820,
  },
  {
    id: "read",
    label: "Read 8 Saves",
    detail: "Compared layout, density, and interaction patterns",
    status: "complete",
    elapsedMs: 1460,
  },
  {
    id: "write",
    label: "Prepared the answer",
    status: "complete",
    elapsedMs: 410,
  },
];

const QUESTION: AssistantQuestion = {
  question: "How should these references be organized?",
  options: ["By visual theme", "By source", "By project", "Keep them flat"],
};

const CHANGES: AssistantChange[] = [
  {
    id: "change-1",
    saveId: "assistant-lab-1",
    title: "A calm interface for a personal archive",
    reason: "Makes the title easier to scan in search results.",
    status: "pending",
    field: "title",
    before: "Archive UI",
    after: "A calm interface for a personal archive",
  },
  {
    id: "change-2",
    saveId: "assistant-lab-2",
    title: "Tools should disappear into the work",
    reason: "Groups this Save with the rest of the interface research.",
    status: "pending",
    field: "tags",
    before: ["inspiration"],
    after: ["inspiration", "agent-ui", "interaction"],
  },
];

const SECTIONS = [
  ["conversation", "Conversation"],
  ["header", "Header"],
  ["messages", "Messages + Markdown"],
  ["results", "Save results"],
  ["references", "References"],
  ["activity", "Tool activity"],
  ["question", "Question"],
  ["review", "Change review"],
  ["composer", "Composer"],
  ["menus", "@ and / menus"],
  ["states", "States"],
] as const;

interface Tokens {
  width: number;
  text: number;
  leading: number;
  composerRadius: number;
  cardRadius: number;
  responseGap: number;
}

const DEFAULT_TOKENS: Tokens = {
  width: 660,
  text: 14,
  leading: 1.75,
  composerRadius: 12,
  cardRadius: 8,
  responseGap: 32,
};

function sourceFromSave(save: ReturnType<typeof useSaves>[number]) {
  return {
    id: save.id,
    title: save.title,
    url: save.url,
    source: save.source,
    description: save.description,
    notes: save.notes,
  } satisfies AssistantSource;
}

function Specimen({
  id,
  title,
  description,
  children,
  flush = false,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section id={id} className={styles.specimen}>
      <header className={styles.specimenHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <code>{id}</code>
      </header>
      <div className={flush ? styles.flushStage : styles.stage}>{children}</div>
    </section>
  );
}

function Composer({ sources }: { sources: AssistantSource[] }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <div
      className={`${agentStyles.assistant} ${styles.composerRoot}`}
      data-layout="page"
    >
      <div className={agentStyles["compose-area"]}>
        <div ref={anchor} className={agentStyles["composer-shell"]}>
          <div className={agentStyles.composer}>
            <Attachments
              saves={sources.slice(0, 2)}
              onRemove={() => undefined}
              onOpenSave={() => undefined}
            />
            <textarea
              ref={input}
              aria-label="Assistant message"
              defaultValue="Compare these references and show the strongest patterns."
            />
            <div className={agentStyles["composer-toolbar"]}>
              <div className={agentStyles["composer-tools"]}>
                <AddMenu
                  referencedCount={6}
                  composerRef={input}
                  anchorRef={anchor}
                  onSaves={() => undefined}
                  onReferenced={() => undefined}
                  onAction={() => undefined}
                />
                <button type="button" className={agentStyles["model-trigger"]}>
                  Ollama
                </button>
              </div>
              <Button
                icon
                size="sm"
                className={agentStyles["send-button"]}
                aria-label="Send message"
              >
                <IconArrowUpFill18 />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionPanel({ kind }: { kind: "@" | "/" }) {
  const actionOptions = [
    [IconFileOutline18, "Summarize", "Pull out the main ideas"],
    [IconLink2Outline18, "Connect Ideas", "Find shared themes"],
    [IconTagsOutline18, "Organize Saves", "Review titles, tags, and folders"],
  ] as const;
  const saveOptions = [
    [IconFileOutline18, "Agent interfaces as workspaces", "are.na"],
    [IconFileOutline18, "Inline citations", "cosmos.so"],
    [IconFileOutline18, "Information density", "article"],
  ] as const;
  const options = kind === "@" ? saveOptions : actionOptions;
  return (
    <div className={styles.suggestionDemo}>
      <span className={styles.triggerKey}>{kind}</span>
      <div className={styles.suggestionPanel}>
        <strong>{kind === "@" ? "Saves" : "Actions"}</strong>
        {options.map(([Icon, title, detail], index) => (
          <div
            className={styles.suggestionOption}
            data-active={index === 0 || undefined}
            key={title}
          >
            <Icon />
            <span>{title}</span>
            <small>{detail}</small>
          </div>
        ))}
        <footer>
          <span>↑ ↓ Navigate</span>
          <span>↵ {kind === "@" ? "Attach" : "Insert"}</span>
          <span>esc Close</span>
        </footer>
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.control}>
      <span>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export function AssistantLab({ onExit }: { onExit: () => void }) {
  const saves = useSaves();
  const [tokens, setTokens] = useState(DEFAULT_TOKENS);
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [attached, setAttached] = useState<string[]>([]);
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-theme");
    const wasDark = root.classList.contains("dark");
    const wasLight = root.classList.contains("light");
    const keys = [
      "--ds-bg-l",
      "--ds-bg-c",
      "--ds-bg-h",
      "--ds-fg-l",
      "--ds-fg-c",
      "--ds-fg-h",
      "--ds-accent-l",
      "--ds-accent-c",
      "--ds-accent-h",
      "--ds-contrast",
    ] as const;
    const previousValues = keys.map((key) => root.style.getPropertyValue(key));
    const theme = themeCssVars(
      scheme === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME,
    );
    const values = [
      theme.bgL,
      theme.bgC,
      theme.bgH,
      theme.fgL,
      theme.fgC,
      theme.fgH,
      theme.accentL,
      theme.accentC,
      theme.accentH,
      theme.contrast,
    ];
    keys.forEach((key, index) => {
      root.style.setProperty(key, String(values[index]));
    });
    root.setAttribute("data-theme", scheme);
    root.classList.toggle("dark", scheme === "dark");
    root.classList.toggle("light", scheme === "light");
    return () => {
      if (previous) root.setAttribute("data-theme", previous);
      else root.removeAttribute("data-theme");
      root.classList.toggle("dark", wasDark);
      root.classList.toggle("light", wasLight);
      keys.forEach((key, index) => {
        const value = previousValues[index];
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      });
    };
  }, [scheme]);
  const sources = useMemo(() => {
    const fromLibrary = saves
      .filter((save) => !save.deletedAt)
      .slice(0, 8)
      .map(sourceFromSave);
    return fromLibrary.length >= 4 ? fromLibrary : FALLBACK_SOURCES;
  }, [saves]);
  const result = {
    title: "Visual references for calm agent interfaces",
    saveIds: sources.map((source) => source.id),
  };
  const variables: CSSProperties &
    Record<`--assistant-${string}`, string | number> = {
    "--assistant-content-width": `${tokens.width}px`,
    "--assistant-text-size": `${tokens.text}px`,
    "--assistant-line-height": tokens.leading,
    "--assistant-composer-radius": `${tokens.composerRadius}px`,
    "--assistant-card-radius": `${tokens.cardRadius}px`,
    "--assistant-response-gap": `${tokens.responseGap}px`,
  };
  const attach = (next: AssistantSource[]) =>
    setAttached((current) => [
      ...new Set([...current, ...next.map((source) => source.id)]),
    ]);
  const update = <K extends keyof Tokens>(key: K, value: Tokens[K]) =>
    setTokens((current) => ({ ...current, [key]: value }));

  return (
    <Tooltip.Provider>
      <div className={styles.root} data-assistant-lab>
        <header className={styles.header}>
          <Button size="sm" variant="ghost" rounding="rounded" onClick={onExit}>
            <IconChevronLeftOutline12 />
            Library
          </Button>
          <div className={styles.identity}>
            <Logo size={16} />
            <span>Assistant Lab</span>
            <span className={styles.badge}>{SECTIONS.length}</span>
          </div>
          <p>Production components · local fixtures · no model calls</p>
        </header>
        <div className={styles.body}>
          <aside className={styles.navigation}>
            <div className={styles.navIntro}>
              <strong>Chat system</strong>
              <span>Every component on one page.</span>
            </div>
            <nav aria-label="Assistant components">
              {SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`}>
                  {label}
                </a>
              ))}
            </nav>
            <Button
              size="sm"
              variant="secondary"
              rounding="rounded"
              onClick={() => window.scrollTo({ top: 0 })}
            >
              Back to top
            </Button>
          </aside>
          <main
            className={styles.main}
            data-scheme={scheme}
            data-density={density}
            style={variables}
          >
            <div className={styles.pageIntro}>
              <span>ASSISTANT DESIGN SYSTEM</span>
              <h1>See the whole conversation.</h1>
              <p>
                Tune the tokens on the right, compare individual parts below,
                then change the production styles with the values that work.
              </p>
            </div>

            <Specimen
              id="conversation"
              title="Conversation"
              description="The main page composition at the selected content width."
              flush
            >
              <div className={styles.conversationFrame}>
                <div className={agentStyles.assistant} data-layout="page">
                  <ChatHeader
                    chatId="current"
                    chats={[
                      { id: "current", title: "Research interface patterns" },
                      { id: "previous", title: "Organize visual references" },
                    ]}
                    disabled={false}
                    onNewChat={() => undefined}
                    onOpenChat={() => undefined}
                  >
                    <Button
                      icon
                      size="sm"
                      variant="ghost"
                      aria-label="References"
                    >
                      <IconGridLayoutRowsOutline18 />
                    </Button>
                  </ChatHeader>
                  <div className={styles.conversationBody}>
                    <div className={agentStyles["thread-inner"]}>
                      <div className={agentStyles["user-turn"]}>
                        <div className={agentStyles["user-message"]}>
                          Find the strongest patterns across my agent UI
                          references.
                        </div>
                      </div>
                      <article className={agentStyles.response}>
                        <div className={agentStyles["response-identity"]}>
                          <span className={agentStyles["thinking-mark"]}>
                            <Logo size={18} />
                          </span>
                          Assistant
                        </div>
                        <ToolActivity steps={STEPS} />
                        <AssistantResponse
                          content={
                            "Three patterns repeat across the collection: **quiet chrome**, **visual evidence beside the answer**, and **actions that appear in context**. The strongest examples keep the conversation readable while the sources remain one click away [1](#save-1).\n\n- Use compact progress instead of raw tool logs.\n- Keep citations inline with the claim they support.\n- Let visual results carry more weight than descriptions."
                          }
                          sources={sources}
                          onOpenSave={() => undefined}
                          onAttach={attach}
                        />
                        <ResultSet
                          result={result}
                          sources={sources}
                          attachedIds={attached}
                          onOpenSave={() => undefined}
                          onAttach={attach}
                        />
                      </article>
                    </div>
                  </div>
                  <Composer sources={sources} />
                </div>
              </div>
            </Specimen>

            <Specimen
              id="header"
              title="Header"
              description="Shared between the page and side panel, with chat history and contextual actions."
              flush
            >
              <ChatHeader
                chatId="current"
                chats={[
                  { id: "current", title: "Research interface patterns" },
                  { id: "second", title: "Connected ideas" },
                ]}
                disabled={false}
                onNewChat={() => undefined}
                onOpenChat={() => undefined}
              >
                <Button icon size="sm" variant="ghost" aria-label="References">
                  <IconGridLayoutRowsOutline18 />
                </Button>
                <Button icon size="sm" variant="ghost" aria-label="New view">
                  <IconPlusOutline18 />
                </Button>
              </ChatHeader>
            </Specimen>

            <Specimen
              id="messages"
              title="Messages + Markdown"
              description="User turns, hierarchy, lists, tables, code, links, and inline Save citations."
            >
              <div className={agentStyles.assistant} data-layout="page">
                <div className={agentStyles["thread-inner"]}>
                  <div className={agentStyles["user-message"]}>
                    Compare these references and make the answer skimmable.
                  </div>
                  <article className={agentStyles.response}>
                    <div className={agentStyles["response-identity"]}>
                      <span className={agentStyles["thinking-mark"]}>
                        <Logo size={18} />
                      </span>
                      Assistant
                    </div>
                    <AssistantResponse
                      content={
                        "## What repeats\n\nThe interfaces use **small controls and generous reading space** [1](#save-1). They expose progress as a short sentence, then let the result become the focus.\n\n| Pattern | Use it for |\n| --- | --- |\n| Inline references | Claims and comparisons |\n| Visual result grids | Image-heavy searches |\n| Review cards | Changes that need approval |\n\n> The answer should feel like a useful document, not a transcript of internal machinery."
                      }
                      sources={sources}
                      onOpenSave={() => undefined}
                      onAttach={attach}
                    />
                  </article>
                </div>
              </div>
            </Specimen>

            <Specimen
              id="results"
              title="Save results"
              description="Visual retrieval output with direct Save navigation, progressive disclosure, and attach actions."
            >
              <ResultSet
                result={result}
                sources={sources}
                attachedIds={attached}
                onOpenSave={() => undefined}
                onAttach={attach}
              />
            </Specimen>

            <Specimen
              id="references"
              title="References"
              description="The consulted Saves as a separate board for visual inspection and reuse."
              flush
            >
              <div className={styles.referenceFrame}>
                <ReferenceBoard
                  sources={sources}
                  attachedIds={attached}
                  onOpenSave={() => undefined}
                  onAttach={attach}
                  onClose={() => undefined}
                  autoFocus={false}
                />
              </div>
            </Specimen>

            <Specimen
              id="activity"
              title="Tool activity"
              description="A compact completion line that expands into understandable work."
            >
              <div className={styles.narrow}>
                <ToolActivity steps={STEPS} />
                <ToolActivity
                  active
                  steps={[
                    ...STEPS.slice(0, 2),
                    {
                      id: "running",
                      label: "Connecting ideas",
                      detail: "Finding repeated visual patterns",
                      status: "running",
                    },
                  ]}
                />
              </div>
            </Specimen>

            <Specimen
              id="question"
              title="Question"
              description="A structured clarification that stays inside the answer flow."
            >
              <Question
                question={QUESTION}
                disabled={false}
                onAnswer={() => undefined}
                onWrite={() => undefined}
              />
            </Specimen>

            <Specimen
              id="review"
              title="Change review"
              description="Proposed library edits shown as inspectable diffs before anything changes."
            >
              <ChangeReview
                messageId="assistant-lab-message"
                changes={CHANGES}
                disabled
              />
            </Specimen>

            <Specimen
              id="composer"
              title="Composer"
              description="The single starting point for new chats and the persistent input after a response."
            >
              <Composer sources={sources} />
            </Specimen>

            <Specimen
              id="menus"
              title="@ and / menus"
              description="Inline retrieval and actions, close to the typing context."
            >
              <div className={styles.menuGrid}>
                <SuggestionPanel kind="@" />
                <SuggestionPanel kind="/" />
              </div>
            </Specimen>

            <Specimen
              id="states"
              title="States"
              description="Empty, thinking, consent, and error states without introductory clutter."
            >
              <div className={styles.stateGrid}>
                <article className={styles.stateCard}>
                  <span>EMPTY CHAT</span>
                  <div className={styles.emptyComposer}>
                    <Composer sources={[]} />
                  </div>
                </article>
                <article className={styles.stateCard}>
                  <span>THINKING</span>
                  <div
                    className={agentStyles["response-identity"]}
                    data-thinking
                  >
                    <span className={agentStyles["thinking-mark"]}>
                      <Logo size={18} />
                    </span>
                    Reading Saves
                  </div>
                </article>
                <article className={styles.stateCard}>
                  <span>CONSENT</span>
                  <div className={agentStyles.notice}>
                    <div>
                      <strong>Send this message to Anthropic?</strong>
                      <p>
                        Your conversation and the Saves needed for this answer
                        will be sent to your provider.
                      </p>
                      <div className={agentStyles["notice-actions"]}>
                        <Button size="sm">Allow Once</Button>
                        <button type="button">Cancel</button>
                      </div>
                    </div>
                  </div>
                </article>
                <article className={styles.stateCard}>
                  <span>ERROR</span>
                  <p className={agentStyles["change-error"]} role="alert">
                    The response stopped before it finished. Continue when the
                    provider is available.
                  </p>
                  <Button size="sm" variant="secondary">
                    Continue
                  </Button>
                </article>
              </div>
            </Specimen>
          </main>

          <aside className={styles.inspector}>
            <header>
              <strong>Customize</strong>
              <Button
                size="xs"
                variant="ghost"
                rounding="rounded"
                onClick={() => setTokens(DEFAULT_TOKENS)}
              >
                Reset
              </Button>
            </header>
            <fieldset className={styles.segmented} aria-label="Color scheme">
              {(["light", "dark"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={scheme === value}
                  onClick={() => setScheme(value)}
                >
                  {value[0]?.toUpperCase()}
                  {value.slice(1)}
                </button>
              ))}
            </fieldset>
            <fieldset className={styles.segmented} aria-label="Density">
              {(["comfortable", "compact"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={density === value}
                  onClick={() => setDensity(value)}
                >
                  {value === "comfortable" ? "Comfort" : "Compact"}
                </button>
              ))}
            </fieldset>
            <RangeControl
              label="Content width"
              value={tokens.width}
              min={420}
              max={820}
              step={10}
              suffix="px"
              onChange={(value) => update("width", value)}
            />
            <RangeControl
              label="Body text"
              value={tokens.text}
              min={12}
              max={18}
              suffix="px"
              onChange={(value) => update("text", value)}
            />
            <RangeControl
              label="Line height"
              value={tokens.leading}
              min={1.4}
              max={2}
              step={0.05}
              suffix=""
              onChange={(value) => update("leading", value)}
            />
            <RangeControl
              label="Composer radius"
              value={tokens.composerRadius}
              min={4}
              max={24}
              suffix="px"
              onChange={(value) => update("composerRadius", value)}
            />
            <RangeControl
              label="Card radius"
              value={tokens.cardRadius}
              min={0}
              max={20}
              suffix="px"
              onChange={(value) => update("cardRadius", value)}
            />
            <RangeControl
              label="Response gap"
              value={tokens.responseGap}
              min={16}
              max={52}
              suffix="px"
              onChange={(value) => update("responseGap", value)}
            />
            <div className={styles.tokenOutput}>
              <span>Current tokens</span>
              <code>{`width ${tokens.width}px\ntext ${tokens.text}px / ${tokens.leading}\ncomposer ${tokens.composerRadius}px\ncards ${tokens.cardRadius}px\ngap ${tokens.responseGap}px`}</code>
            </div>
          </aside>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
