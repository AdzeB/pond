import { IconChevronExpandYOutline12 } from "@pond/icons/outline/12";
import {
  IconArrowUpRightOutline18,
  IconPlusOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { Button, ContentRow, Reveal, Tooltip, useTextReveal } from "@pond/ui";
import {
  type AppendMessage,
  AssistantRuntimeProvider,
  useAui,
  useAuiState,
  useExternalStoreRuntime,
} from "@pond/ui/assistant-runtime";
import { ComposerView } from "@pond/ui/composer";
import { ComposerPopover } from "@pond/ui/composer-popover";
import { Logo } from "@pond/ui/logo";
import { Message } from "@pond/ui/message";
import { ConversationView } from "@pond/ui/thread";
import {
  ASSISTANT_MODELS,
  type AssistantProvider,
  type AssistantSource,
  type AssistantMessage as DomainMessage,
} from "@shared/assistant";
import { chosenModelId, displayName } from "@shared/provider-models";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type AssistantState,
  assistant,
  useAssistant,
} from "@/features/agent/state/assistant";
import { toThreadMessage } from "@/features/agent/state/assistant-runtime";
import { libraryChrome } from "@/features/library/state/library-chrome";
import {
  selection,
  useSelectionSize,
} from "@/features/library/state/selection";
import { openSave } from "@/features/saves/lib/save-nav";
import { ProviderLogo } from "@/features/settings/components/sections/agent/icons";
import { openSettings } from "@/features/settings/lib/open-settings";
import { usePrefs } from "@/features/settings/state/prefs";
import { getAppRouter } from "@/shared/lib/app-router";
import {
  AGENT_STARTERS,
  type AgentStarter,
  ASSISTANT_ACTIONS,
  type AssistantAction,
} from "./actions";
import { ComposerActions } from "./add-menu";
import { AssistantResponse } from "./assistant-response";
import { ChatHeader } from "./chat-header";
import { ComposerSuggestions } from "./composer-suggestions";
import { Attachments, ContextPicker } from "./context";
import { ModelPicker } from "./model-picker";
import styles from "./pane.module.css";
import { ResponseContent } from "./response-content";
import { ResultSet } from "./result-set";
import { ToolActivity } from "./tool-activity";
import { useComposerSuggestions } from "./use-composer-suggestions";

const activityLabel = {
  thinking: "Thinking",
  searching: "Searching your library",
  reading: "Reading Saves",
  writing: "Writing a response",
  preparing: "Preparing changes",
};

type ComposerPage = "add" | "models" | "references" | "context" | "suggestions";

const composerTitles = {
  add: undefined,
  models: "Models",
  context: "Add Context",
  references: "Referenced Saves",
  suggestions: undefined,
} as const;

interface AgentMessageContextValue {
  state: AssistantState;
  provider: AssistantProvider;
  attachedIds: string[];
  attach: (sources: AssistantSource[]) => void;
  focus: () => void;
}

const AgentMessageContext = createContext<AgentMessageContextValue | null>(
  null,
);

function useAgentMessage() {
  const value = useContext(AgentMessageContext);
  if (!value) throw new Error("Agent messages require AgentMessageContext");
  return value;
}

interface PondRuntimeMessage extends DomainMessage {
  streaming?: boolean;
}

function UserMessage({ message }: { message: DomainMessage }) {
  return (
    <Message.Root className={styles["user-turn"]}>
      <Attachments saves={message.metadata?.attachments ?? []} />
      <Message.Body className={styles["user-bubble"]}>
        {message.content}
      </Message.Body>
    </Message.Root>
  );
}

function StreamingResponse({ message }: { message: PondRuntimeMessage }) {
  const { state, attach } = useAgentMessage();
  const streaming = Boolean(message.streaming);
  const sources = message.metadata?.sources ?? (streaming ? state.sources : []);
  const steps = streaming ? state.steps : (message.metadata?.steps ?? []);
  return (
    <article className={styles.response} aria-busy="true">
      {message.content ? (
        <AssistantResponse
          content={message.content}
          sources={sources}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ) : null}
      <Reveal>
        <div className={styles["response-identity"]} data-thinking>
          <span className={styles["thinking-mark"]}>
            <Logo size={18} />
          </span>
          <span role="status">
            {streaming ? activityLabel[state.activity] : "Writing a response"}
          </span>
        </div>
      </Reveal>
      <Reveal visible={Boolean(steps.length)}>
        <ToolActivity steps={steps} active={streaming} />
      </Reveal>
    </article>
  );
}

function AssistantMessage({ message }: { message: PondRuntimeMessage }) {
  const { state, provider, attachedIds, attach, focus } = useAgentMessage();
  const finished = Boolean(
    message.metadata?.stopped || message.metadata?.error,
  );
  const streaming = Boolean(message.streaming) && !finished;
  const reveal = useTextReveal(message.content, streaming, finished);
  if (streaming || reveal.pending) {
    return <StreamingResponse message={{ ...message, content: reveal.text }} />;
  }
  return (
    <div>
      <ResponseContent
        message={message}
        questionAnswer={
          state.messages.find(
            (reply) => reply.metadata?.replyToQuestion === message.id,
          )?.content
        }
        questionDisabled={
          state.busy ||
          state.loading ||
          state.messages.at(-1)?.id !== message.id
        }
        provider={provider}
        attachedIds={attachedIds}
        busy={state.busy}
        attach={attach}
        focus={focus}
      />
    </div>
  );
}

function PondMessage(props: ComponentProps<typeof Message.Root>) {
  const { state } = useAgentMessage();
  const id = useAuiState((thread) => thread.message.id);
  const role = useAuiState((thread) => thread.message.role);
  const pondMessage =
    state.messages.find((message) => message.id === id) ??
    ({
      id,
      chatId: state.chatId ?? "pending",
      role: role === "user" ? "user" : "assistant",
      content: "",
      metadata: null,
    } satisfies DomainMessage);
  return pondMessage.role === "user" ? (
    <UserMessage message={pondMessage} />
  ) : (
    <Message.Root {...props} className={styles["assistant-turn"]}>
      <AssistantMessage
        message={{
          ...pondMessage,
          streaming: state.busy && id === `${state.requestId}:assistant`,
        }}
      />
    </Message.Root>
  );
}

function ComposerDraftSync({ draft }: { draft: string }) {
  const aui = useAui();
  useEffect(() => {
    if (aui.composer.getState().text === draft) return;
    aui.composer.setText(draft);
  }, [aui, draft]);
  return null;
}

function appendText(message: AppendMessage) {
  return message.content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("");
}

function AgentChatRuntime({
  state,
  provider,
  children,
}: {
  state: AssistantState;
  provider: AssistantProvider | "";
  children: ReactNode;
}) {
  const runtime = useExternalStoreRuntime({
    messages: state.messages,
    isRunning: state.busy,
    isLoading: state.loading,
    isDisabled: state.loading,
    isSendDisabled: state.busy || !provider,
    convertMessage: (message) => toThreadMessage(message),
    onNew: async (message) => {
      const content = appendText(message).trim();
      if (!provider || !content) return;
      assistant.setDraft(content);
      await assistant.send(provider);
    },
    onCancel: async () => assistant.stop(),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function AgentPaneContent({
  layout,
  state,
  provider,
  modelId,
  patchModel,
  reduceMotion,
}: {
  layout: "page" | "pane";
  state: AssistantState;
  provider: AssistantProvider | "";
  modelId: string;
  patchModel: (next: { provider: AssistantProvider; modelId: string }) => void;
  reduceMotion: boolean;
}) {
  const selectedCount = useSelectionSize();
  const [trayView, setTrayView] = useState<Exclude<
    ComposerPage,
    "suggestions"
  > | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const suggestions = useComposerSuggestions({
    value: state.draft,
    attachments: state.attachments,
    inputRef: input,
    disabled: state.loading || !provider,
    onChange: (value) => {
      setTrayView(null);
      assistant.setDraft(value);
    },
    onAttach: attach,
  });
  const empty = !state.messages.length && !state.busy && !state.loading;
  const latestReferenceMessage = state.messages.findLast(
    (message) =>
      message.role === "assistant" && message.metadata?.sources?.length,
  );
  const references = latestReferenceMessage?.metadata?.sources ?? [];
  const referenceMessage = state.messages.find(
    (message) => message.id === state.referenceMessageId,
  );
  const referenceSources = referenceMessage?.metadata?.sources;
  const retainedReferenceSources = useRef<AssistantSource[]>([]);
  if (referenceSources?.length)
    retainedReferenceSources.current = referenceSources;
  const attachedIds = state.attachments.map((source) => source.id);
  const composerPage: ComposerPage | null = referenceSources?.length
    ? "references"
    : suggestions.open
      ? "suggestions"
      : trayView;

  function openTray(view: Exclude<ComposerPage, "suggestions">) {
    suggestions.dismiss();
    assistant.closeReferences();
    setTrayView((current) => (current === view ? null : view));
  }
  function closeTray() {
    assistant.closeReferences();
    setTrayView(null);
    suggestions.dismiss();
  }
  function renderTray(view: ComposerPage) {
    switch (view) {
      case "add":
        return (
          <ComposerActions
            referencedCount={references.length}
            onSaves={() => setTrayView("context")}
            onReferenced={() => {
              if (latestReferenceMessage)
                assistant.showReferences(latestReferenceMessage.id);
            }}
            onAction={(kind) => {
              closeTray();
              action(kind);
            }}
            onModels={() => setTrayView("models")}
            modelLabel={modelId ? displayName(modelId) : "Choose a model"}
            modelsDisabled={state.busy}
          />
        );
      case "references":
        return (
          <ResultSet
            result={{
              title: "Consulted Saves",
              saveIds: retainedReferenceSources.current.map(
                (source) => source.id,
              ),
            }}
            sources={retainedReferenceSources.current}
            attachedIds={attachedIds}
            onOpenSave={openSave}
            onAttach={(sources) => {
              closeTray();
              attach(sources);
            }}
          />
        );
      case "models":
        return (
          <ModelPicker
            inline
            provider={provider}
            modelId={modelId}
            disabled={state.busy}
            onChange={(next) => {
              patchModel(next);
              closeTray();
            }}
          />
        );
      case "context":
        return (
          <ContextPicker
            inline
            attached={state.attachments}
            onAdd={attach}
            onClose={closeTray}
          />
        );
      case "suggestions":
        return (
          <ComposerSuggestions
            inline
            suggestions={suggestions}
            anchorRef={composer}
          />
        );
    }
  }
  function focus() {
    input.current?.focus();
  }
  function attach(sources: AssistantSource[]) {
    assistant.attach(sources);
    requestAnimationFrame(focus);
  }
  function action(kind: AssistantAction) {
    const selected = ASSISTANT_ACTIONS.find((entry) => entry.id === kind);
    if (selected) assistant.appendDraft(selected.prompt);
    requestAnimationFrame(focus);
  }
  function start(kind: AgentStarter) {
    const selected = AGENT_STARTERS.find((entry) => entry.id === kind);
    if (selected) assistant.appendDraft(selected.prompt);
    requestAnimationFrame(focus);
  }
  const messageContext = {
    state,
    provider: provider || ASSISTANT_MODELS[0].id,
    attachedIds,
    attach,
    focus,
  };

  return (
    <AgentMessageContext.Provider value={messageContext}>
      <MotionConfig
        reducedMotion={reduceMotion ? "always" : "never"}
        transition={{ type: "spring", duration: 0.22, bounce: 0 }}
      >
        <section
          className={styles.assistant}
          data-layout={layout}
          data-reduced-motion={reduceMotion || undefined}
          aria-label="Agent"
        >
          <ChatHeader
            chatId={state.chatId}
            chats={state.chats}
            disabled={state.busy || state.loading}
            onNewChat={() => {
              assistant.newChat();
              requestAnimationFrame(focus);
            }}
            onOpenChat={(id) => void assistant.openChat(id)}
          >
            {layout === "pane" ? (
              <>
                <Tooltip label="Open Agent Page">
                  <Button
                    icon
                    size="sm"
                    variant="ghost"
                    aria-label="Open Agent Page"
                    onClick={() => getAppRouter()?.history.push("/assistant")}
                  >
                    <IconArrowUpRightOutline18 />
                  </Button>
                </Tooltip>
                <Tooltip label="Close Agent">
                  <Button
                    icon
                    size="sm"
                    variant="ghost"
                    aria-label="Close Agent"
                    onClick={() => libraryChrome.setAgentOpen(false)}
                  >
                    <IconXmarkOutline18 />
                  </Button>
                </Tooltip>
              </>
            ) : null}
          </ChatHeader>
          <ComposerDraftSync draft={state.draft} />
          <div className={styles["assistant-workspace"]}>
            <ConversationView
              key={state.chatId ?? "new"}
              className={styles["assistant-body"]}
              viewportProps={{ className: styles["chat-viewport"] }}
              empty={
                empty ? (
                  <>
                    {state.loading ? (
                      <p role="status">Loading conversation</p>
                    ) : null}
                    {provider ? (
                      <div className={styles.starters}>
                        {AGENT_STARTERS.map((entry) => (
                          <ContentRow.Root key={entry.id}>
                            <ContentRow.Trigger onClick={() => start(entry.id)}>
                              <ContentRow.Media>
                                <entry.icon />
                              </ContentRow.Media>
                              <ContentRow.Content>
                                <ContentRow.Title>
                                  {entry.title}
                                </ContentRow.Title>
                                <ContentRow.Description>
                                  {entry.detail}
                                </ContentRow.Description>
                              </ContentRow.Content>
                            </ContentRow.Trigger>
                          </ContentRow.Root>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : state.loading ? (
                  <p role="status">Loading conversation</p>
                ) : (
                  "Ask about your Saves"
                )
              }
              components={{ Message: PondMessage }}
              composer={
                <motion.div
                  layout="position"
                  className={styles["compose-area"]}
                >
                  <Reveal visible={!provider}>
                    <div className={styles.notice} role="status">
                      <div>
                        <p>Add a provider in Settings before you can send.</p>
                        <div className={styles["notice-actions"]}>
                          <Button
                            size="sm"
                            onClick={() => openSettings("models")}
                          >
                            Open Settings
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                  <Reveal visible={Boolean(state.error)}>
                    <div className={styles.notice} role="alert">
                      <div>
                        <p>{state.error}</p>
                        <div className={styles["notice-actions"]}>
                          {state.failed ? (
                            <Button
                              size="sm"
                              onClick={() => void assistant.retry()}
                            >
                              Retry
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openSettings("models")}
                          >
                            Model Settings
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={assistant.clearError}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                  <ComposerPopover
                    open={Boolean(composerPage)}
                    page={composerPage ?? "add"}
                    title={
                      composerPage ? composerTitles[composerPage] : undefined
                    }
                    anchorRef={composer}
                    inputRef={input}
                    onOpenChange={(open) => {
                      if (!open) closeTray();
                    }}
                    onBack={() => {
                      assistant.closeReferences();
                      setTrayView("add");
                    }}
                  >
                    {composerPage ? renderTray(composerPage) : null}
                  </ComposerPopover>
                  <div ref={composer}>
                    <ComposerView
                      placeholder={
                        state.busy
                          ? "Draft your next message"
                          : "Ask about your Saves"
                      }
                      toolbar={
                        <>
                          <Tooltip label="Add Context or Action">
                            <Button
                              icon
                              size="xs"
                              variant="ghost"
                              data-composer-options-trigger
                              aria-label="Add Context or Action"
                              aria-haspopup="dialog"
                              aria-expanded={trayView === "add"}
                              onClick={() => openTray("add")}
                            >
                              <IconPlusOutline18 />
                            </Button>
                          </Tooltip>
                          <Button
                            size="xs"
                            variant="ghost"
                            data-composer-options-trigger
                            className={styles["model-trigger"]}
                            disabled={state.busy}
                            aria-label={`Choose model, ${modelId ? displayName(modelId) : "Choose a model"}`}
                            aria-haspopup="dialog"
                            aria-expanded={trayView === "models"}
                            onClick={() => openTray("models")}
                          >
                            {provider ? (
                              <ProviderLogo provider={provider} size={16} />
                            ) : null}
                            <span className={styles["model-trigger-name"]}>
                              {modelId
                                ? displayName(modelId)
                                : "Choose a model"}
                            </span>
                            <IconChevronExpandYOutline12 />
                          </Button>
                        </>
                      }
                      inputProps={{
                        ref: input,
                        value: state.draft,
                        disabled: state.loading || !provider,
                        maxLength: 32000,
                        "aria-label": "Message Agent",
                        ...suggestions.inputProps,
                        onKeyDown: (event) => {
                          suggestions.onKeyDown(event);
                        },
                      }}
                    >
                      {selectedCount ? (
                        <div className={styles["selection-line"]}>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              void assistant.attachIds([
                                ...selection.snapshot(),
                              ]);
                            }}
                          >
                            Attach {selectedCount} Selected
                          </Button>
                        </div>
                      ) : null}
                      <Attachments
                        saves={state.attachments}
                        onRemove={(id) => assistant.removeAttachment(id)}
                      />
                    </ComposerView>
                  </div>
                </motion.div>
              }
            />
          </div>
        </section>
      </MotionConfig>
    </AgentMessageContext.Provider>
  );
}

export function AgentPane({ layout = "pane" }: { layout?: "page" | "pane" }) {
  const state = useAssistant();
  const [prefs, patchPrefs] = usePrefs("agent");
  const [preferences] = usePrefs("preferences");
  const systemReducedMotion = useReducedMotion();
  const reduceMotion =
    preferences.reduceMotion === "always" ||
    (preferences.reduceMotion !== "never" && Boolean(systemReducedMotion));
  const provider =
    ASSISTANT_MODELS.find((model) => model.id === prefs.languageModel)?.id ??
    "";
  const modelId = provider ? chosenModelId(provider, prefs) : "";
  return (
    <AgentChatRuntime state={state} provider={provider}>
      <AgentPaneContent
        layout={layout}
        state={state}
        provider={provider}
        modelId={modelId}
        patchModel={(next) => {
          const update: Partial<typeof prefs> = {
            languageModel: next.provider,
            visionModel: "",
            modelIds: { ...prefs.modelIds, [next.provider]: next.modelId },
          };
          if (next.provider === "ollama") update.ollamaModelId = next.modelId;
          if (next.provider === "lmstudio")
            update.lmstudioModelId = next.modelId;
          if (next.provider === "compatible")
            update.compatibleModelId = next.modelId;
          patchPrefs(update);
        }}
        reduceMotion={reduceMotion}
      />
    </AgentChatRuntime>
  );
}
