import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import {
  IconArrowUpRightOutline18,
  IconChevronDownOutline18,
  IconGridLayoutRowsOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import { Logo } from "@pond/ui/logo";
import {
  ASSISTANT_MODELS,
  type AssistantProvider,
  type AssistantSource,
} from "@shared/assistant";
import { useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getAppRouter } from "@/lib/ui/app-router";
import { openSave } from "@/lib/ui/save-nav";
import {
  type AssistantState,
  assistant,
  useAssistant,
} from "@/stores/assistant";
import { libraryChrome } from "@/stores/library-chrome";
import { usePrefs } from "@/stores/prefs";
import { selection, useSelectionSize } from "@/stores/selection";
import { settingsModal } from "@/stores/settings-modal";
import { ASSISTANT_ACTIONS, type AssistantAction } from "./actions";
import { AddMenu } from "./add-menu";
import { AssistantResponse } from "./assistant-response";
import {
  type PondRuntimeMessage,
  usePondAssistantRuntime,
} from "./assistant-runtime";
import { ChatHeader } from "./chat-header";
import { ComposerSuggestions } from "./composer-suggestions";
import { Attachments, ContextPicker } from "./context";
import { ModelPicker } from "./model-picker";
import { ReferenceBoard } from "./reference-board";
import { ResponseContent } from "./response-content";
import { ResultSet } from "./result-set";
import styles from "./styles.module.css";
import { ToolActivity } from "./tool-activity";
import { useComposerSuggestions } from "./use-composer-suggestions";

const activityLabel = {
  thinking: "Thinking",
  searching: "Searching your library",
  reading: "Reading Saves",
  writing: "Writing a response",
  preparing: "Preparing changes",
};

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

function usePondMessage() {
  return useAuiState(
    (state) => state.message.metadata.custom.pondMessage as PondRuntimeMessage,
  );
}

function UserText() {
  const text = useAuiState((state) =>
    state.part.type === "text" ? state.part.text : "",
  );
  return <div className={styles["user-message"]}>{text}</div>;
}

function UserMessage() {
  const message = usePondMessage();
  return (
    <MessagePrimitive.Root className={styles["user-turn"]}>
      <Attachments saves={message.metadata?.attachments ?? []} />
      <MessagePrimitive.Parts components={{ Text: UserText }} />
    </MessagePrimitive.Root>
  );
}

function StreamingResponse({ message }: { message: PondRuntimeMessage }) {
  const { state, attachedIds, attach } = useAgentMessage();
  const sources = message.metadata?.sources ?? [];
  return (
    <article className={styles.response} aria-busy="true">
      <div className={styles["response-identity"]} data-thinking>
        <span className={styles["thinking-mark"]}>
          <Logo size={18} />
        </span>
        <span role="status">{activityLabel[state.activity]}</span>
      </div>
      <ToolActivity steps={message.metadata?.steps ?? []} active />
      {message.content ? (
        <AssistantResponse
          content={message.content}
          sources={sources}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ) : null}
      {(message.metadata?.results ?? []).map((result) => (
        <ResultSet
          key={`${result.title}-${result.saveIds.join(",")}`}
          result={result}
          sources={sources}
          attachedIds={attachedIds}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ))}
      {sources.length ? (
        <p className={styles["work-detail"]}>
          {sources.length} {sources.length === 1 ? "Save found" : "Saves found"}
        </p>
      ) : null}
    </article>
  );
}

function AssistantMessage() {
  const message = usePondMessage();
  const { state, provider, attachedIds, attach, focus } = useAgentMessage();
  if (message.streaming) {
    return (
      <MessagePrimitive.Root>
        <StreamingResponse message={message} />
      </MessagePrimitive.Root>
    );
  }
  return (
    <MessagePrimitive.Root>
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
        consent={Boolean(state.consent)}
        attach={attach}
        focus={focus}
      />
    </MessagePrimitive.Root>
  );
}

function Conversation({ loading }: { loading: boolean }) {
  return (
    <ThreadPrimitive.Root className={styles["thread-frame"]}>
      <ThreadPrimitive.Viewport
        className={styles.thread}
        autoScroll
        scrollToBottomOnInitialize
        scrollToBottomOnThreadSwitch
      >
        <div className={styles["thread-inner"]}>
          {loading ? <p role="status">Loading conversation</p> : null}
          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
        </div>
        <ThreadPrimitive.ScrollToBottom
          className={styles["jump-to-latest"]}
          aria-label="Jump to latest reply"
        >
          <IconChevronDownOutline18 />
          Latest Reply
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function RuntimeDraftBridge({ draft }: { draft: string }) {
  const aui = useAui();
  useEffect(() => {
    if (aui.composer.getState().text !== draft) aui.composer.setText(draft);
  }, [aui, draft]);
  return null;
}

function AgentPaneContent({
  layout,
  state,
  provider,
  patchProvider,
  reduceMotion,
}: {
  layout: "page" | "pane";
  state: AssistantState;
  provider: AssistantProvider;
  patchProvider: (provider: AssistantProvider) => void;
  reduceMotion: boolean;
}) {
  const aui = useAui();
  const selectedCount = useSelectionSize();
  const [pickerOpen, setPickerOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const suggestions = useComposerSuggestions({
    value: state.draft,
    attachments: state.attachments,
    inputRef: input,
    disabled: state.busy || state.loading || Boolean(state.consent),
    onChange: assistant.setDraft,
    onAttach: assistant.attach,
  });
  const empty = !state.messages.length && !state.busy && !state.loading;
  const latestReferenceMessage = state.messages.findLast(
    (message) =>
      message.role === "assistant" && message.metadata?.sources?.length,
  );
  const references = latestReferenceMessage?.metadata?.sources ?? [];
  const boardMessage = state.messages.find(
    (message) => message.id === state.referenceMessageId,
  );
  const boardSources = boardMessage?.metadata?.sources;
  const attachedIds = state.attachments.map((source) => source.id);

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
  const messageContext = { state, provider, attachedIds, attach, focus };

  return (
    <AgentMessageContext.Provider value={messageContext}>
      <RuntimeDraftBridge draft={state.draft} />
      <section
        className={styles.assistant}
        data-layout={layout}
        data-reduced-motion={reduceMotion || undefined}
        aria-label="Assistant"
      >
        <ChatHeader
          chatId={state.chatId}
          chats={state.chats}
          disabled={state.busy || state.loading}
          onNewChat={() => {
            assistant.newChat();
            aui.composer.setText("");
            requestAnimationFrame(focus);
          }}
          onOpenChat={(id) => void assistant.openChat(id)}
        >
          {latestReferenceMessage ? (
            <Tooltip label="References">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="References"
                aria-pressed={Boolean(boardSources?.length)}
                onClick={() => {
                  if (boardSources?.length) assistant.closeReferences();
                  else assistant.showReferences(latestReferenceMessage.id);
                }}
              >
                <IconGridLayoutRowsOutline18 />
              </Button>
            </Tooltip>
          ) : null}
          {layout === "pane" ? (
            <>
              <Tooltip label="Open Assistant Page">
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Open Assistant Page"
                  onClick={() => getAppRouter()?.history.push("/assistant")}
                >
                  <IconArrowUpRightOutline18 />
                </Button>
              </Tooltip>
              <Tooltip label="Close Assistant">
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Close Assistant"
                  onClick={() => libraryChrome.setAgentOpen(false)}
                >
                  <IconXmarkOutline18 />
                </Button>
              </Tooltip>
            </>
          ) : null}
        </ChatHeader>
        <div
          className={styles["assistant-workspace"]}
          data-board-open={Boolean(boardSources?.length)}
        >
          <div className={styles["assistant-body"]} data-empty={empty}>
            {!empty ? <Conversation loading={state.loading} /> : null}
            <div className={styles["compose-area"]}>
              {state.consent ? (
                <div className={styles.notice} role="status">
                  <div>
                    <strong>
                      Send this message to{" "}
                      {
                        ASSISTANT_MODELS.find(
                          (model) => model.id === state.consent?.provider,
                        )?.provider
                      }
                      ?
                    </strong>
                    <p>
                      Your conversation and Saves read to answer this message
                      will be sent to your provider. This allows this message
                      only.
                    </p>
                    <div className={styles["notice-actions"]}>
                      <Button
                        size="sm"
                        onClick={() => void assistant.allowOnce()}
                      >
                        Allow Once
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={assistant.cancelConsent}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {state.error ? (
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
                        onClick={() => settingsModal.open("agent")}
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
              ) : null}
              <ComposerSuggestions
                suggestions={suggestions}
                anchorRef={composer}
              />
              <div className={styles["composer-shell"]} ref={composer}>
                <ComposerPrimitive.Root className={styles.composer}>
                  {selectedCount ? (
                    <div className={styles["selection-line"]}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          void assistant.attachIds([...selection.snapshot()])
                        }
                      >
                        Attach {selectedCount} Selected
                      </Button>
                    </div>
                  ) : null}
                  <Attachments
                    saves={state.attachments}
                    onRemove={assistant.removeAttachment}
                  />
                  <ComposerPrimitive.Input
                    ref={input}
                    minRows={2}
                    maxRows={7}
                    maxLength={32000}
                    aria-label="Message Assistant"
                    placeholder="Ask anything about your library"
                    {...suggestions.inputProps}
                    onKeyDown={(event) => {
                      suggestions.onKeyDown(event);
                    }}
                  />
                  <div className={styles["composer-toolbar"]}>
                    <div className={styles["composer-tools"]}>
                      <AddMenu
                        referencedCount={references.length}
                        composerRef={input}
                        anchorRef={composer}
                        onSaves={() => setPickerOpen(true)}
                        onReferenced={() => attach(references)}
                        onAction={action}
                      />
                      <ModelPicker
                        value={provider}
                        disabled={state.busy || Boolean(state.consent)}
                        onChange={patchProvider}
                      />
                    </div>
                    {state.busy ? (
                      <ComposerPrimitive.Cancel
                        className={styles["send-button"]}
                        aria-label="Stop Response"
                      >
                        <span className={styles["stop-square"]} />
                      </ComposerPrimitive.Cancel>
                    ) : (
                      <ComposerPrimitive.Send
                        className={styles["send-button"]}
                        aria-label="Send Message"
                      >
                        <IconArrowUpFill18 />
                      </ComposerPrimitive.Send>
                    )}
                  </div>
                </ComposerPrimitive.Root>
              </div>
            </div>
          </div>
          {boardSources?.length ? (
            <ReferenceBoard
              sources={boardSources}
              attachedIds={attachedIds}
              onOpenSave={openSave}
              onAttach={(sources) => {
                assistant.closeReferences();
                attach(sources);
              }}
              onClose={() => {
                assistant.closeReferences();
                requestAnimationFrame(focus);
              }}
            />
          ) : null}
        </div>
        {pickerOpen ? (
          <ContextPicker
            attached={state.attachments}
            onAdd={assistant.attach}
            onClose={() => {
              setPickerOpen(false);
              requestAnimationFrame(focus);
            }}
          />
        ) : null}
      </section>
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
  const provider = (ASSISTANT_MODELS.find(
    (model) => model.id === prefs.languageModel,
  )?.id ?? "minnow") as AssistantProvider;
  const runtime = usePondAssistantRuntime(state, provider);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AgentPaneContent
        layout={layout}
        state={state}
        provider={provider}
        patchProvider={(next) => patchPrefs({ languageModel: next })}
        reduceMotion={reduceMotion}
      />
    </AssistantRuntimeProvider>
  );
}
