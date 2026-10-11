import { ApprovalCard } from "@pond/ui/approval-card";
import { QuestionCard } from "@pond/ui/question-card";
import type {
  AssistantMessage,
  AssistantProvider,
  AssistantSource,
} from "@shared/assistant";
import { assistant } from "@/features/agent/state/assistant";
import { openSave } from "@/features/saves/navigation";
import { AssistantResponse } from "./assistant-response";
import { ConsultedSaves } from "./consulted-saves";
import { ResponseError } from "./response-error";
import { ChangeReview } from "./review";
import { WorkSummary } from "./work-summary";

export function inferredLookupResult(
  content: string,
  sources: AssistantSource[],
) {
  if (sources.length < 2) return null;
  const lines = content
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const references: number[] = [];
  for (const line of lines) {
    if (!/^(?:(?:\d+[.)]|[-*+])\s+)?\[\d+\]/.test(line)) return null;
    const matches = [...line.matchAll(/\[(\d+)\](?:\(#save-(\d+)\))?/g)];
    if (!matches.length) return null;
    for (const match of matches) {
      const reference = Number(match[2] ?? match[1]);
      if (reference < 1 || reference > sources.length) return null;
      references.push(reference);
    }
  }
  const saveIds = [...new Set(references)].flatMap(
    (reference) => sources[reference - 1]?.id ?? [],
  );
  if (saveIds.length < 2) return null;
  return { title: "References", saveIds } as const;
}

export function ResponseExtras({
  message,
  questionAnswer,
  questionDisabled,
  provider,
  attachedIds,
  busy,
  attach,
  onAnswer,
}: {
  message: AssistantMessage;
  questionAnswer?: string;
  questionDisabled: boolean;
  provider: AssistantProvider;
  attachedIds: string[];
  busy: boolean;
  attach: (sources: AssistantSource[]) => void;
  onAnswer?: (answer: string) => Promise<void>;
}) {
  const sources = message.metadata?.sources ?? [];
  const inferredResult = inferredLookupResult(message.content, sources);
  const results = message.metadata?.results?.length
    ? message.metadata.results
    : inferredResult
      ? [inferredResult]
      : [];
  return (
    <>
      {results.map((result) => (
        <ConsultedSaves
          key={result.title}
          sources={sources}
          saveIds={result.saveIds}
          attachedIds={attachedIds}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ))}
      {message.metadata?.question ? (
        <QuestionCard
          title={message.metadata.question.question}
          options={message.metadata.question.options.map((option) => ({
            id: option,
            label: option,
          }))}
          answered={questionAnswer}
          allowFreeform={!questionDisabled}
          disabled={questionDisabled}
          onAnswer={async (answer) => {
            if (onAnswer) {
              await onAnswer(answer);
              return;
            }
            await assistant.answerQuestion(message.id, answer, provider);
          }}
        />
      ) : null}
      {message.metadata?.changes?.length ? (
        <ApprovalCard
          title="Review before applying"
          eyebrow="Library changes"
          description={
            message.metadata.changes.some(
              (change) =>
                change.field === "action" && change.action === "purgeTrash",
            )
              ? "Empty trash removes Saves forever. Only selected changes will be applied."
              : "Only selected changes will be applied. You can undo them here."
          }
          decision="pending"
          showActions={false}
          onApprove={async () => undefined}
          onReject={async () => undefined}
        >
          <ChangeReview
            messageId={message.id}
            disabled={busy}
            changes={message.metadata.changes}
          />
        </ApprovalCard>
      ) : null}
      {message.metadata?.error ? (
        <ResponseError error={message.metadata.error} />
      ) : null}
      {sources.length && !results.length ? (
        <ConsultedSaves
          sources={sources}
          attachedIds={attachedIds}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ) : null}
    </>
  );
}

export function ResponseContent({
  message,
  attach,
  ...props
}: Parameters<typeof ResponseExtras>[0]) {
  const sources = message.metadata?.sources ?? [];
  const lookup = inferredLookupResult(message.content, sources);
  return (
    <>
      <WorkSummary metadata={message.metadata} />
      {!lookup ? (
        <AssistantResponse
          content={message.content}
          sources={sources}
          onOpenSave={openSave}
        />
      ) : null}
      <ResponseExtras message={message} attach={attach} {...props} />
    </>
  );
}
