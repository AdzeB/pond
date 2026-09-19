import { useChat } from "@ai-sdk/react";
import {
  IconArrowsExpandDiagonalOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import type { AgentModelOptions } from "@pond/schema";
import { Button, Tooltip } from "@pond/ui";
import { ComposerView } from "@pond/ui/composer";
import { ErrorNotice } from "@pond/ui/error-notice";
import { MessageActions, MessageView } from "@pond/ui/message";
import { RunStatus } from "@pond/ui/run-status";
import { ConversationView } from "@pond/ui/thread";
import {
  agentModelOptionsFor,
  agentModelOptionsKey,
  runControlsForOptions,
} from "@shared/agent-model-options";
import {
  ASSISTANT_MODELS,
  type AssistantProvider,
  type AssistantSource,
} from "@shared/assistant";
import { chosenModelId } from "@shared/provider-models";
import { MotionConfig, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import {
  type AssistantState,
  assistant,
  useAssistant,
} from "@/features/agent/state/assistant";
import { pondChatSession } from "@/features/agent/state/pond-chat";
import {
  fromUIMessage,
  messageText,
  type PondUIMessage,
  partData,
} from "@/features/agent/state/pond-messages";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { openSave } from "@/features/saves/lib/save-nav";
import {
  isLibrarySaveDrag,
  saveDropIds,
} from "@/features/saves/lib/start-drag";
import { openSettings } from "@/features/settings/lib/open-settings";
import { usePrefs } from "@/features/settings/state/prefs";
import { getAppRouter } from "@/shared/lib/app-router";
import { ComposerEditor, type ComposerEditorHandle } from "../composer";
import { currentActivityLabel } from "./activity-label";
import { AssistantResponse } from "./assistant-response";
import { AttachFilesButton } from "./attach-files";
import { ChatActions } from "./chat-actions";
import { ChatContext } from "./chat-context";
import { ChatHeader } from "./chat-header";
import { ReferencedSavesPopover } from "./consulted-saves";
import { FileAttachments } from "./file-attachments";
import { ModelPicker } from "./model-picker";
import { inferredLookupResult, ResponseExtras } from "./response-content";
import styles from "./styles.module.css";
import { WorkSummary } from "./work-summary";

function AgentMessage({
  message,
  state,
  provider,
  attachedIds,
  attach,
  streaming,
  latest,
  onAnswer,
}: {
  message: PondUIMessage;
  state: AssistantState;
  provider: AssistantProvider;
  attachedIds: string[];
  attach: (sources: AssistantSource[]) => void;
  streaming: boolean;
  latest: boolean;
  onAnswer: (messageId: string, answer: string) => Promise<void>;
}) {
  const domain = fromUIMessage(message, state.chatId ?? "pending");
  const text = messageText(message);
  const steps = partData(message, "pond-steps") ?? state.steps;
  const activity =
    partData(message, "pond-activity")?.activity ?? state.activity;
  const showActivity =
    message.role === "assistant" &&
    streaming &&
    (!text || steps.some((step) => step.status === "running"));
  const sources = domain.metadata?.sources?.length
    ? domain.metadata.sources
    : streaming
      ? state.sources
      : [];
  const extras = {
    ...domain,
    metadata: {
      ...domain.metadata,
      sources: sources.length ? sources : domain.metadata?.sources,
      steps:
        streaming && state.steps.length ? state.steps : domain.metadata?.steps,
    },
  };
  const attachments =
    domain.metadata?.attachments ??
    (message.role === "user"
      ? state.messages.find((row) => row.id === message.id)?.metadata
          ?.attachments
      : undefined);
  return (
    <MessageView
      animateEntrance={streaming}
      role={message.role === "user" ? "user" : "assistant"}
      footer={
        message.role === "assistant" ? (
          <ResponseExtras
            message={extras}
            questionAnswer={
              state.messages.find(
                (reply) => reply.metadata?.replyToQuestion === extras.id,
              )?.content
            }
            questionDisabled={state.busy || state.loading || !latest}
            provider={provider}
            attachedIds={attachedIds}
            busy={state.busy}
            attach={attach}
            onAnswer={(answer) => onAnswer(extras.id, answer)}
          />
        ) : null
      }
      actions={
        message.role === "assistant" && !text ? null : (
          <MessageActions
            text={text}
            onQuote={() => {
              if (sources.length) attach(sources);
              else if (text) assistant.quote(text);
            }}
          />
        )
      }
    >
      {message.role === "assistant" ? (
        <WorkSummary metadata={extras.metadata} streaming={streaming} />
      ) : null}
      {message.role === "user" ? (
        <FileAttachments files={domain.metadata?.files ?? []} />
      ) : null}
      {message.role === "assistant" &&
      inferredLookupResult(text, sources) ? null : text ? (
        <AssistantResponse
          content={text}
          sources={message.role === "user" ? (attachments ?? []) : sources}
          onOpenSave={openSave}
          onAttach={message.role === "user" ? undefined : attach}
        />
      ) : null}
      {showActivity ? (
        <RunStatus>{currentActivityLabel(activity, steps)}</RunStatus>
      ) : null}
    </MessageView>
  );
}

function AgentPaneContent({
  layout,
  state,
  provider,
  modelId,
  modelOptions,
  patchModel,
  patchModelOptions,
  reduceMotion,
}: {
  layout: "page" | "pane";
  state: AssistantState;
  provider: AssistantProvider | "";
  modelId: string;
  modelOptions: AgentModelOptions;
  patchModel: (next: { provider: AssistantProvider; modelId: string }) => void;
  patchModelOptions: (next: AgentModelOptions) => void;
  reduceMotion: boolean;
}) {
  const [dropping, setDropping] = useState(false);
  const input = useRef<ComposerEditorHandle>(null);
  const composer = useRef<HTMLDivElement>(null);
  const chat = pondChatSession(state.chatId ?? "draft");
  const { messages, status, error: chatError } = useChat({ chat });
  const running =
    status === "submitted" || status === "streaming" || state.busy;
  const referenceMessage = state.messages.find(
    (message) => message.id === state.referenceMessageId,
  );
  const referenceSources = referenceMessage?.metadata?.sources;
  const retainedReferenceSources = useRef<AssistantSource[]>([]);
  if (referenceSources?.length)
    retainedReferenceSources.current = referenceSources;
  const attachedIds = state.attachments.map((source) => source.id);
  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  function focus() {
    input.current?.focus();
  }
  function attach(sources: AssistantSource[]) {
    assistant.attach(sources);
    requestAnimationFrame(focus);
  }
  function submit(content = state.draft) {
    if (!provider || running) return;
    assistant.setDraft(content);
    void assistant.send(provider, {
      modelId,
      controls: runControlsForOptions(modelOptions),
    });
  }
  async function answerQuestion(messageId: string, answer: string) {
    if (!provider || running) return;
    await assistant.answerQuestion(messageId, answer, provider, {
      modelId,
      controls: runControlsForOptions(modelOptions),
    });
  }

  return (
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
          actions={
            layout === "page" ? (
              <>
                <ChatContext
                  attached={state.attachments}
                  previous={[
                    ...new Map(
                      state.messages
                        .flatMap(
                          (message) => message.metadata?.attachments ?? [],
                        )
                        .map((save) => [save.id, save]),
                    ).values(),
                  ]}
                />
                <ChatActions
                  chatId={state.chatId}
                  title={
                    state.chats.find((chat) => chat.id === state.chatId)
                      ?.title ?? null
                  }
                  messages={state.messages}
                  disabled={running || state.loading}
                />
              </>
            ) : undefined
          }
          chatId={state.chatId}
          chats={state.chats}
          disabled={running || state.loading}
          onNewChat={
            layout === "page"
              ? () => {
                  assistant.newChat();
                  requestAnimationFrame(focus);
                }
              : undefined
          }
          onOpenChat={(id) => void assistant.openChat(id)}
        >
          {layout === "pane" ? (
            <>
              <Tooltip label="Open Agent Page" side="bottom">
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Open Agent Page"
                  onClick={() => getAppRouter()?.history.push("/assistant")}
                >
                  <IconArrowsExpandDiagonalOutline18 />
                </Button>
              </Tooltip>
              <Tooltip label="Close Agent" side="bottom">
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
        <div className={styles["assistant-workspace"]}>
          <ConversationView
            key={state.chatId ?? "new"}
            className={styles["assistant-body"]}
            viewportProps={{
              className: styles["chat-viewport"],
            }}
            empty={
              state.loading ? <p role="status">Loading conversation</p> : null
            }
            composer={
              <div className={styles["compose-area"]}>
                <div className={styles.notices}>
                  {!provider ? (
                    <ErrorNotice
                      title="Connect a provider in Settings before you can send."
                      actions={
                        <Button
                          size="sm"
                          onClick={() => openSettings("models")}
                        >
                          Open Settings
                        </Button>
                      }
                    />
                  ) : null}
                  {state.error || chatError ? (
                    <ErrorNotice
                      title={
                        state.error ??
                        chatError?.message ??
                        "Could not send this message."
                      }
                      onRetry={
                        state.failed ? () => void assistant.retry() : undefined
                      }
                      actions={
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openSettings("agent-models")}
                          >
                            Open Models
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={assistant.clearError}
                          >
                            Dismiss
                          </Button>
                        </>
                      }
                    />
                  ) : null}
                </div>
                <ReferencedSavesPopover
                  open={Boolean(referenceSources?.length)}
                  sources={retainedReferenceSources.current}
                  attachedIds={attachedIds}
                  anchorRef={composer}
                  onAttach={attach}
                  onClose={() => assistant.closeReferences()}
                />
                <div
                  ref={composer}
                  onDragEnterCapture={(event) => {
                    if (!isLibrarySaveDrag(event.dataTransfer)) return;
                    event.preventDefault();
                    setDropping(true);
                  }}
                  onDragOverCapture={(event) => {
                    if (!isLibrarySaveDrag(event.dataTransfer)) return;
                    event.preventDefault();
                    if (event.dataTransfer)
                      event.dataTransfer.dropEffect = "copy";
                    setDropping(true);
                  }}
                  onDragLeaveCapture={(event) => {
                    if (
                      event.relatedTarget instanceof Node &&
                      event.currentTarget.contains(event.relatedTarget)
                    )
                      return;
                    setDropping(false);
                  }}
                  onDropCapture={(event) => {
                    const ids = saveDropIds(event.dataTransfer);
                    if (!ids.length) return;
                    event.preventDefault();
                    setDropping(false);
                    void assistant.attachIds(ids);
                    requestAnimationFrame(focus);
                  }}
                >
                  <ComposerView
                    placeholder={
                      running
                        ? "Draft your next message"
                        : "Ask about your Saves"
                    }
                    running={running}
                    data-dragging={dropping || undefined}
                    onSend={() => submit()}
                    onStop={assistant.stop}
                    toolbar={
                      <>
                        <AttachFilesButton
                          disabled={state.loading}
                          onAttach={(files) => {
                            assistant.attachFiles(files);
                            requestAnimationFrame(focus);
                          }}
                        />
                        <ModelPicker
                          provider={provider}
                          modelId={modelId}
                          options={modelOptions}
                          disabled={running}
                          onChange={patchModel}
                          onOptionsChange={patchModelOptions}
                        />
                      </>
                    }
                    editor={
                      <ComposerEditor
                        key={state.chatId ?? "draft"}
                        ref={input}
                        value={state.draft}
                        disabled={state.loading || !provider}
                        running={running}
                        placeholder={
                          running
                            ? "Draft your next message"
                            : "Ask about your Saves"
                        }
                        attachments={state.attachments}
                        anchorRef={composer}
                        onChange={(value) => assistant.setDraft(value)}
                        onSend={submit}
                        onAttach={attach}
                        onRemove={(id) => assistant.removeAttachment(id)}
                        onDropIds={(ids) => {
                          void assistant.attachIds(ids);
                          requestAnimationFrame(focus);
                        }}
                      />
                    }
                  >
                    <FileAttachments
                      files={state.files}
                      onRemove={assistant.removeFile}
                    />
                  </ComposerView>
                </div>
              </div>
            }
          >
            {messages.map((message) => (
              <AgentMessage
                key={message.id}
                message={message}
                state={state}
                provider={provider || ASSISTANT_MODELS[0].id}
                attachedIds={attachedIds}
                attach={attach}
                streaming={
                  status === "streaming" &&
                  message.role === "assistant" &&
                  message.id === messages.at(-1)?.id
                }
                latest={message.id === lastAssistantId}
                onAnswer={answerQuestion}
              />
            ))}
          </ConversationView>
        </div>
      </section>
    </MotionConfig>
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
  const modelOptions = agentModelOptionsFor(
    prefs.modelOptions,
    provider,
    modelId,
  );
  return (
    <AgentPaneContent
      layout={layout}
      state={state}
      provider={provider}
      modelId={modelId}
      modelOptions={modelOptions}
      patchModel={(next) => {
        const update: Partial<typeof prefs> = {
          languageModel: next.provider,
          visionModel: "",
          modelIds: { ...prefs.modelIds, [next.provider]: next.modelId },
        };
        if (next.provider === "ollama") update.ollamaModelId = next.modelId;
        if (next.provider === "lmstudio") update.lmstudioModelId = next.modelId;
        patchPrefs(update);
      }}
      patchModelOptions={(next) => {
        if (!provider || !modelId) return;
        patchPrefs({
          modelOptions: {
            ...prefs.modelOptions,
            [agentModelOptionsKey(provider, modelId)]: next,
          },
        });
      }}
      reduceMotion={reduceMotion}
    />
  );
}
