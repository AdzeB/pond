import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import {
  IconAlbum2Outline18,
  IconArrowUpRightOutline18,
  IconCheckOutline18,
  IconChevronDownOutline18,
  IconClockRotateClockwiseOutline18,
  IconPencilOutline18,
  IconPlusOutline18,
  IconTriangleWarningOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui/button";
import { Logo } from "@pond/ui/logo";
import { Menu } from "@pond/ui/menu";
import { Tooltip } from "@pond/ui/tooltip";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AddMenu } from "./add-menu";
import { ChangeReview } from "./change-review";
import {
  answer,
  changeModes,
  organizeQuestion,
  type Provider,
  question,
  type Scenario,
  type Scope,
  type Surface,
  saves,
  scopeLabels,
  themes,
} from "./fixtures";
import { ModelPicker } from "./model-picker";
import {
  Attachments,
  LibraryDialog,
  SaveCover,
  SaveDialog,
  SourceCards,
  sampleSave,
} from "./save-components";

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label}>
      <Button
        className="icon-button"
        icon
        size="xs"
        variant="ghost"
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export function Assistant({
  surface,
  scenario,
  onExpand,
}: {
  surface: Surface;
  scenario: Scenario;
  onExpand: () => void;
}) {
  const [mode, setMode] = useState<Scenario>(scenario);
  const [draft, setDraft] = useState(
    scenario === "context"
      ? "Compare the ideas in these saves."
      : scenario === "error" || scenario === "consent"
        ? question
        : "",
  );
  const [provider, setProvider] = useState<Provider>(
    scenario === "consent" || scenario === "error" ? "Anthropic" : "Ollama",
  );
  const [attached, setAttached] = useState<number[]>(
    scenario === "context" ? [0, 1] : [],
  );
  const [sentAttachments, setSentAttachments] = useState<number[]>(
    ["reading", "responding", "answer", "stopped"].includes(scenario)
      ? [0, 1]
      : changeModes.includes(scenario)
        ? [0, 1, 2]
        : [],
  );
  const [scope, setScope] = useState<Scope>(
    scenario === "context" ? "attached" : "library",
  );
  const [sentScope, setSentScope] = useState<Scope>("library");
  const [sourceIds, setSourceIds] = useState<number[]>([0, 1, 2]);
  const [prompt, setPrompt] = useState(
    changeModes.includes(scenario)
      ? organizeQuestion
      : scenario === "no-results"
        ? "Find the essay I saved about Japanese joinery."
        : question,
  );
  const [progress, setProgress] = useState(scenario === "stopped" ? 74 : 0);
  const [playing, setPlaying] = useState(scenario === "responding");
  const [closed, setClosed] = useState(false);
  const [source, setSource] = useState<number | null>(null);
  const [library, setLibrary] = useState<{
    kind: "picker" | "library";
    highlight: number[];
  } | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState([0, 1, 2]);
  const [proposed, setProposed] = useState([0, 1, 2]);
  const [applied, setApplied] = useState<number[]>(
    scenario === "applied"
      ? [0, 1, 2]
      : scenario === "partial-error"
        ? [0, 1]
        : [],
  );
  const [failed, setFailed] = useState<number[]>(
    scenario === "partial-error" ? [2] : [],
  );
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [stoppedAt, setStoppedAt] = useState<Scenario>("responding");
  const input = useRef<HTMLTextAreaElement>(null);
  const composerShell = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const follow = useRef(scenario === "responding" || scenario === "applying");
  const responseText =
    sourceIds.length === 3
      ? answer
      : "These saves explore how thoughtful design makes software feel easier to use.";
  const busy = [
    "searching",
    "reading",
    "responding",
    "preparing",
    "applying",
  ].includes(mode);
  const empty = ["empty", "context", "consent", "error"].includes(mode);
  const reviewingChanges = changeModes.includes(mode);
  const referencedIds =
    empty || mode === "no-results"
      ? []
      : reviewingChanges
        ? proposed
        : sourceIds;
  const folders = ["Design", "Inbox"].map((name) => ({
    name,
    count: saves.filter((_, id) => sampleSave(id, applied).folder === name)
      .length,
  }));
  const status =
    mode === "searching"
      ? `Searching ${sentScope === "design" ? "your Design folder" : sentScope === "attached" ? "attached Saves" : "your library"}`
      : mode === "reading"
        ? `Reading ${sourceIds.length} ${sourceIds.length === 1 ? "Save" : "Saves"}`
        : mode === "responding"
          ? "Writing a response"
          : mode === "preparing"
            ? "Preparing changes"
            : mode === "applying"
              ? "Applying approved changes"
              : "Assistant";

  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "0px";
    input.current.style.height = `${draft ? Math.min(112, Math.max(48, input.current.scrollHeight)) : 48}px`;
  }, [draft]);

  useEffect(() => {
    if (!playing) return;
    const next =
      mode === "searching"
        ? "reading"
        : mode === "reading"
          ? "responding"
          : mode === "preparing"
            ? "review"
            : null;
    if (next) {
      const timer = window.setTimeout(() => {
        setMode(next);
        if (next === "review") setPlaying(false);
      }, 1500);
      return () => window.clearTimeout(timer);
    }
    if (mode === "responding") {
      const timer = window.setInterval(
        () => setProgress((value) => Math.min(responseText.length, value + 3)),
        35,
      );
      return () => window.clearInterval(timer);
    }
  }, [playing, mode, responseText]);

  useEffect(() => {
    if (playing && mode === "responding" && progress >= responseText.length) {
      setMode("answer");
      setPlaying(false);
    }
  }, [progress, playing, mode, responseText]);

  useEffect(() => {
    if (mode !== "applying") return;
    const pending = selected.filter(
      (id) => !applied.includes(id) && !failed.includes(id),
    );
    const timer = window.setTimeout(() => {
      if (pending.length === 0) {
        setMode(failed.length ? "partial-error" : "applied");
        return;
      }
      if (simulateFailure && pending[0] === selected.at(-1))
        setFailed((ids) => [...ids, pending[0]]);
      else setApplied((ids) => [...ids, pending[0]]);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [mode, selected, applied, failed, simulateFailure]);

  useEffect(() => {
    if (empty) return;
    const viewport = thread.current;
    const content = viewport?.firstElementChild;
    if (!viewport || !content) return;
    if (
      !follow.current &&
      (scenario === "answer" ||
        (changeModes.includes(scenario) && scenario !== "preparing"))
    ) {
      const response = content.querySelector(".response");
      if (response)
        viewport.scrollTop =
          response.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top -
          16;
    }
    const observer = new ResizeObserver(() => {
      if (follow.current) viewport.scrollTop = viewport.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [empty, scenario]);

  function start(text: string, allow = false, contextOverride?: number[]) {
    if (!text.trim() || busy) return;
    if (provider !== "Ollama" && !allow) {
      setMode("consent");
      setDraft(text);
      if (contextOverride) {
        setAttached(contextOverride);
        setScope("attached");
      }
      return;
    }
    if (!contextOverride && scope === "attached" && !attached.length) {
      setLibrary({ kind: "picker", highlight: [] });
      return;
    }
    const editing = /organize|rename|\btag\b|folders?/i.test(text);
    const ids =
      contextOverride ??
      (scope === "attached"
        ? [...attached]
        : scope === "design"
          ? saves
              .map((_, id) => id)
              .filter((id) => sampleSave(id, applied).folder === "Design")
          : [0, 1, 2]);
    setSentAttachments(editing ? ids : [...attached]);
    setSourceIds(ids);
    setSentScope(contextOverride ? "attached" : scope);
    setPrompt(text.trim());
    setDraft("");
    setAttached([]);
    setScope("library");
    setFeedback("");
    setCopied(false);
    setProgress(0);
    setSourcesOpen(true);
    if (editing) {
      setSelected(ids);
      setProposed(ids);
      setApplied([]);
      setFailed([]);
    }
    setMode(editing ? "preparing" : "searching");
    setPlaying(true);
    follow.current = true;
  }

  function reset() {
    setPlaying(false);
    setMode("empty");
    setDraft("");
    setAttached([]);
    setSentAttachments([]);
    setScope("library");
    setProgress(0);
    setFeedback("");
    setCopied(false);
    setApplied([]);
    setFailed([]);
    setSelected([0, 1, 2]);
    setProposed([0, 1, 2]);
    input.current?.focus();
  }

  function stop() {
    setPlaying(false);
    if (mode === "applying") {
      const pending = selected.filter((id) => !applied.includes(id));
      setFailed(pending);
      setMode(pending.length ? "partial-error" : "applied");
    } else {
      setStoppedAt(mode);
      setMode("stopped");
    }
  }

  function openLibrary(ids: number[]) {
    setSource(null);
    setLibrary({ kind: "library", highlight: ids });
  }
  function addContext(ids: number[]) {
    setAttached((current) => [...new Set([...current, ...ids])]);
    setScope("attached");
    if (mode === "empty") setMode("context");
    input.current?.focus();
  }
  function prepareAction(action: "summarize" | "connect" | "organize") {
    if (!attached.length && referencedIds.length) addContext(referencedIds);
    setDraft(
      action === "organize"
        ? organizeQuestion
        : action === "summarize"
          ? "Summarize the main ideas in these saves."
          : question,
    );
    input.current?.focus();
  }
  function openHistory(organize = false) {
    setPlaying(false);
    setMode(organize ? "review" : "answer");
    setPrompt(organize ? organizeQuestion : question);
    setSentAttachments([0, 1, 2]);
    setSourceIds([0, 1, 2]);
    setSentScope("library");
    setDraft("");
    setAttached([]);
    setScope("library");
    setApplied([]);
    setFailed([]);
    setSelected([0, 1, 2]);
    setProposed([0, 1, 2]);
    setSourcesOpen(true);
  }
  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(
        `${responseText}\n\n${sourceIds.map((id) => `${themes[id].title}: ${themes[id].body}`).join("\n\n")}`,
      );
      setCopied(true);
    } catch {
      setFeedback("Select the response text to copy it.");
    }
  }

  if (closed)
    return (
      <div className="closed-surface">
        <Logo size={26} />
        <p>Assistant is closed</p>
        <Button size="sm" variant="secondary" onClick={() => setClosed(false)}>
          Open Assistant
        </Button>
      </div>
    );

  return (
    <section
      className="assistant"
      data-layout={surface}
      data-empty={empty}
      aria-label="Assistant preview"
    >
      <header className="assistant-header">
        <div className="assistant-title">
          <Logo size={17} />
          <span>Assistant</span>
          {!empty && surface === "page" ? (
            <span className="thread-title">
              {reviewingChanges
                ? "Organize design saves"
                : "Design connections"}
            </span>
          ) : null}
        </div>
        <div className="assistant-actions">
          <Menu.Root>
            <Menu.Trigger
              icon
              size="xs"
              variant="ghost"
              className="icon-button"
              aria-label="Chat history"
            >
              <IconClockRotateClockwiseOutline18 />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end">
                <Menu.Popup className="history-menu">
                  <Menu.SectionLabel>Sample Chats</Menu.SectionLabel>
                  <Menu.Item onClick={() => openHistory()}>
                    Design connections
                  </Menu.Item>
                  <Menu.Item onClick={() => openHistory(true)}>
                    Organize design saves
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <IconButton label="New Chat" onClick={reset}>
            <IconPencilOutline18 />
          </IconButton>
          <IconButton
            label={surface === "pane" ? "Open Full Page" : "Open Side Pane"}
            onClick={onExpand}
          >
            <IconArrowUpRightOutline18 />
          </IconButton>
          {surface === "pane" ? (
            <IconButton label="Close Assistant" onClick={() => setClosed(true)}>
              <IconXmarkOutline18 />
            </IconButton>
          ) : null}
        </div>
      </header>
      <div className="assistant-body" data-empty={empty}>
        {!empty ? (
          <div
            className="thread"
            ref={thread}
            onScroll={() => {
              const el = thread.current;
              if (el)
                follow.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 50;
            }}
          >
            <div className="thread-inner">
              <div className="user-turn">
                {sentAttachments.length ? (
                  <Attachments
                    ids={sentAttachments}
                    applied={[]}
                    onOpen={setSource}
                  />
                ) : null}
                <div className="user-message">{prompt}</div>
                <span className="sent-scope">{scopeLabels[sentScope]}</span>
              </div>
              <div className="response">
                <div
                  className="response-identity"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  data-thinking={busy || undefined}
                >
                  <span className="thinking-mark" aria-hidden="true">
                    <Logo size={20} />
                  </span>
                  <span>{status}</span>
                </div>
                {mode === "searching" ? (
                  <div className="work-detail">
                    <p>Looking for ideas, titles, and related content.</p>
                    <span>Search scope: {scopeLabels[sentScope]}</span>
                  </div>
                ) : null}
                {mode === "reading" ? (
                  <div className="reading-list">
                    {sourceIds.map((id, index) => (
                      <button
                        type="button"
                        onClick={() => setSource(id)}
                        key={id}
                      >
                        <SaveCover id={id} />
                        <span>
                          {saves[id].title}
                          <small>
                            {index === 0 ? "Reading content" : "Queued"}
                          </small>
                        </span>
                        {index === 0 ? (
                          <span className="reading-indicator" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
                {mode === "preparing" ? (
                  <div className="work-detail">
                    <p>
                      Finding clearer titles, useful tags, and a home for these
                      Saves.
                    </p>
                    <span>You'll review each change before it's applied.</span>
                  </div>
                ) : null}
                {mode === "responding" ? (
                  <p className="streaming-text">
                    {responseText.slice(0, progress)}
                    <span className="text-cursor" aria-hidden="true" />
                  </p>
                ) : null}
                {mode === "stopped" ? (
                  <div className="stopped-response">
                    {progress > 0 ? (
                      <p>{responseText.slice(0, progress)}</p>
                    ) : null}
                    <p className="stopped-label">
                      Response stopped.{" "}
                      {stoppedAt === "preparing"
                        ? "No changes were made."
                        : "Your question and attachments are still here."}
                    </p>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setMode(stoppedAt);
                        setPlaying(true);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                ) : null}
                {mode === "answer" ? (
                  <>
                    <p>{responseText}</p>
                    <div className="answer-themes">
                      {sourceIds.map((id) => (
                        <div key={id}>
                          <h3>
                            {themes[id].title}
                            <button
                              type="button"
                              className="citation"
                              aria-label={`View source ${id + 1}`}
                              onClick={() => setSource(id)}
                            >
                              {id + 1}
                            </button>
                          </h3>
                          <p>{themes[id].body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="sources">
                      <button
                        type="button"
                        className="sources-trigger"
                        aria-expanded={sourcesOpen}
                        onClick={() => setSourcesOpen(!sourcesOpen)}
                      >
                        <IconAlbum2Outline18 />
                        <span>{sourceIds.length} saves referenced</span>
                        <IconChevronDownOutline18 />
                      </button>
                      {sourcesOpen ? (
                        <SourceCards
                          ids={sourceIds}
                          applied={applied}
                          onOpen={setSource}
                          onLibrary={openLibrary}
                        />
                      ) : null}
                    </div>
                    <div className="response-actions">
                      <button type="button" onClick={copyAnswer}>
                        {copied ? (
                          <IconCheckOutline18 />
                        ) : (
                          <IconAlbum2Outline18 />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          start(organizeQuestion, false, sourceIds)
                        }
                      >
                        <IconPlusOutline18 />
                        Organize These Saves
                      </button>
                    </div>
                    {feedback ? (
                      <div className="copy-feedback" role="status">
                        {feedback}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {reviewingChanges && mode !== "preparing" ? (
                  <ChangeReview
                    mode={mode}
                    selected={selected}
                    proposed={proposed}
                    applied={applied}
                    failed={failed}
                    simulateFailure={simulateFailure}
                    onSimulateFailure={setSimulateFailure}
                    onSelect={(id) =>
                      setSelected((ids) =>
                        ids.includes(id)
                          ? ids.filter((item) => item !== id)
                          : [...ids, id],
                      )
                    }
                    onApply={() => {
                      if (mode === "partial-error") setSimulateFailure(false);
                      setFailed([]);
                      setMode("applying");
                    }}
                    onDismiss={() => setMode("dismissed")}
                    onUndo={() => {
                      setApplied([]);
                      setFailed([]);
                      setMode("undone");
                    }}
                    onReview={() => {
                      setApplied([]);
                      setFailed([]);
                      setMode("review");
                    }}
                    onOpen={setSource}
                    onLibrary={openLibrary}
                  />
                ) : null}
                {mode === "no-results" ? (
                  <div className="no-results">
                    <h3>No matching saves</h3>
                    <p>
                      I couldn't find a Save about Japanese joinery. Try an
                      author, site, or phrase you remember.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setDraft("Find saves about Japanese architecture.");
                        input.current?.focus();
                      }}
                    >
                      Try a Broader Search
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <div className="compose-area">
          {empty ? (
            <div className="welcome">
              <Logo size={30} />
              <h1>
                {mode === "context"
                  ? "A closer look at your saves"
                  : "Ask your library"}
              </h1>
              <p>
                {mode === "context"
                  ? "Summarize, compare, or follow an idea further."
                  : "Find something you saved. See how it all connects."}
              </p>
            </div>
          ) : null}
          {mode === "error" ? (
            <div className="notice error-notice" role="alert">
              <IconTriangleWarningOutline18 />
              <div>
                <strong>Couldn't reach Anthropic</strong>
                <p>
                  Your question is still here. Try again or use Ollama on this
                  Mac.
                </p>
                <div className="notice-actions">
                  <button type="button" onClick={() => start(draft, true)}>
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("Ollama");
                      setMode("empty");
                    }}
                  >
                    Use Ollama
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {mode === "consent" ? (
            <div className="notice consent-notice">
              <IconArrowUpRightOutline18 />
              <div>
                <strong>Send to {provider}?</strong>
                <p>
                  Your question and relevant Save content will be sent to this
                  provider. Ollama keeps the conversation on this Mac.
                </p>
                <div className="notice-actions">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => start(draft, true)}
                  >
                    Allow This Message
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("Ollama");
                      setMode("empty");
                    }}
                  >
                    Use Ollama
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="composer-shell" ref={composerShell}>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                start(draft);
              }}
            >
              <div className="scope-line">
                <Menu.Root>
                  <Menu.Trigger
                    size="xs"
                    variant="ghost"
                    className="scope-trigger"
                    aria-label="Search scope"
                  >
                    <IconAlbum2Outline18 />
                    {scopeLabels[scope]}
                    <IconChevronDownOutline18 />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner side="top" align="start">
                      <Menu.Popup>
                        <Menu.SectionLabel>Search In</Menu.SectionLabel>
                        {(["library", "design", "attached"] satisfies Scope[]).map(
                          (value) => (
                            <Menu.Item
                              key={value}
                              onClick={() => {
                                setScope(value);
                                if (value === "attached" && !attached.length)
                                  setLibrary({ kind: "picker", highlight: [] });
                              }}
                            >
                              {scopeLabels[value]}
                              {scope === value ? <IconCheckOutline18 /> : null}
                            </Menu.Item>
                          ),
                        )}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </div>
              {attached.length ? (
                <Attachments
                  ids={attached}
                  applied={applied}
                  onOpen={setSource}
                  onRemove={(id) => {
                    const next = attached.filter((item) => item !== id);
                    setAttached(next);
                    if (!next.length && mode === "context") setMode("empty");
                    if (!next.length && scope === "attached")
                      setScope("library");
                  }}
                />
              ) : null}
              <textarea
                ref={input}
                aria-label="Message Assistant"
                placeholder={
                  attached.length
                    ? "Ask about these saves"
                    : "Ask anything about your library"
                }
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    start(draft);
                  }
                }}
              />
              <div className="composer-toolbar">
                <div className="composer-tools">
                  <AddMenu
                    composerRef={input}
                    anchorRef={composerShell}
                    referencedCount={referencedIds.length}
                    folders={folders}
                    onSaves={() =>
                      setLibrary({ kind: "picker", highlight: [] })
                    }
                    onFolder={(name) =>
                      addContext(
                        saves
                          .map((_, id) => id)
                          .filter(
                            (id) => sampleSave(id, applied).folder === name,
                          ),
                      )
                    }
                    onReferenced={() => addContext(referencedIds)}
                    onAction={prepareAction}
                  />
                  <ModelPicker
                    value={provider}
                    onChange={(next) => {
                      setProvider(next);
                      if (mode === "consent" || mode === "error")
                        setMode("empty");
                    }}
                  />
                </div>
                {busy ? (
                  <Button
                    type="button"
                    icon
                    size="xs"
                    className="send-button"
                    aria-label="Stop"
                    onClick={stop}
                  >
                    <span className="stop-square" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    icon
                    size="xs"
                    className="send-button"
                    aria-label="Send Message"
                    disabled={!draft.trim()}
                  >
                    <IconArrowUpFill18 />
                  </Button>
                )}
              </div>
            </form>
          </div>
          {empty && mode === "empty" && surface === "page" ? (
            <div className="recent-chats">
              <span>Recent chats</span>
              <button type="button" onClick={() => openHistory()}>
                <IconClockRotateClockwiseOutline18 />
                Design connections<small>Yesterday</small>
              </button>
              <button type="button" onClick={() => openHistory(true)}>
                <IconClockRotateClockwiseOutline18 />
                Organize design saves<small>Aug 28</small>
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <SaveDialog
        id={source}
        applied={applied}
        onClose={() => setSource(null)}
        onLibrary={openLibrary}
      />
      {library ? (
        <LibraryDialog
          kind={library.kind}
          highlight={library.highlight}
          attached={attached}
          applied={applied}
          onClose={() => {
            setLibrary(null);
            if (scope === "attached" && !attached.length) setScope("library");
          }}
          onAttach={(ids) => {
            setAttached(ids);
            setScope("attached");
            setLibrary(null);
            if (empty) setMode("context");
            input.current?.focus();
          }}
        />
      ) : null}
    </section>
  );
}
