import { useTextReveal } from "@pond/ui";
import { Message } from "@pond/ui/message";
import { RunStatus } from "@pond/ui/run-status";
import type { AssistantProvider, AssistantSource } from "@shared/assistant";
import { useRef } from "react";
import {
  type AssistantState,
  assistant,
} from "@/features/agent/state/assistant";
import {
  fromUIMessage,
  messageText,
  type PondUIMessage,
  partData,
} from "@/features/agent/state/pond-messages";
import { openSave } from "@/features/saves/navigation";
import { currentActivityLabel } from "./activity-label";
import { AssistantResponse } from "./assistant-response";
import { FileAttachments } from "./file-attachments";
import { inferredLookupResult, ResponseExtras } from "./response-content";
import { WorkSummary } from "./work-summary";

export function AgentMessage({
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
  const finished = Boolean(domain.metadata?.stopped || domain.metadata?.error);
  const reveal = useTextReveal(
    text,
    message.role === "assistant" && streaming,
    finished,
  );
  const responseText = message.role === "assistant" ? reveal.text : text;
  const settled = !streaming && !reveal.pending;
  const animatedResponse = useRef(false);
  if (message.role === "assistant" && (streaming || reveal.pending))
    animatedResponse.current = true;
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
    <Message.View
      animateEntrance={streaming}
      role={message.role === "user" ? "user" : "assistant"}
      footer={
        message.role === "assistant" && settled ? (
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
        message.role === "assistant" && (!text || !settled) ? null : (
          <Message.ActionBar
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
        <WorkSummary
          metadata={extras.metadata}
          streaming={streaming && !text}
        />
      ) : null}
      {message.role === "user" ? (
        <FileAttachments files={domain.metadata?.files ?? []} />
      ) : null}
      {message.role === "assistant" &&
      inferredLookupResult(text, sources) ? null : responseText ? (
        <AssistantResponse
          content={responseText}
          streaming={animatedResponse.current}
          sources={message.role === "user" ? (attachments ?? []) : sources}
          onOpenSave={openSave}
        />
      ) : null}
      {showActivity ? (
        <RunStatus>{currentActivityLabel(activity, steps)}</RunStatus>
      ) : null}
    </Message.View>
  );
}
