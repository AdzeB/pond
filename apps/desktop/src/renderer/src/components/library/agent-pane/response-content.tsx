import { IconArrowUpRightOutline18 } from "@pond/icons/outline/18";
import { Logo } from "@pond/ui/logo";
import type {
  AssistantMessage,
  AssistantProvider,
  AssistantSource,
} from "@shared/assistant";
import { openSave } from "@/lib/ui/save-nav";
import { assistant } from "@/stores/assistant";
import { AssistantResponse } from "./assistant-response";
import { MessageActions } from "./message-actions";
import { Question } from "./question";
import { ResultSet } from "./result-set";
import { ChangeReview } from "./review";
import styles from "./styles.module.css";
import { ToolActivity } from "./tool-activity";

function responseText(message: AssistantMessage) {
  const sources = new Map(
    (message.metadata?.sources ?? []).map((save) => [save.id, save]),
  );
  return [
    message.content,
    ...(message.metadata?.results ?? []).map((result) =>
      [
        result.title,
        ...result.saveIds.flatMap((id) =>
          sources.has(id) ? `- ${sources.get(id)?.title || "Untitled"}` : [],
        ),
      ].join("\n"),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

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

export function ResponseContent({
  message,
  questionAnswer,
  questionDisabled,
  provider,
  attachedIds,
  busy,
  consent,
  attach,
  focus,
}: {
  message: AssistantMessage;
  questionAnswer?: string;
  questionDisabled: boolean;
  provider: AssistantProvider;
  attachedIds: string[];
  busy: boolean;
  consent: boolean;
  attach: (sources: AssistantSource[]) => void;
  focus: () => void;
}) {
  const sources = message.metadata?.sources ?? [];
  const inferredResult = inferredLookupResult(message.content, sources);
  const results = message.metadata?.results?.length
    ? message.metadata.results
    : inferredResult
      ? [inferredResult]
      : [];
  return (
    <article className={styles.response}>
      <div className={styles["response-identity"]}>
        <span className={styles["thinking-mark"]}>
          <Logo size={18} />
        </span>
        Assistant
      </div>
      {message.content && !inferredResult ? (
        <AssistantResponse
          content={message.content}
          sources={sources}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ) : null}
      {results.map((result) => (
        <ResultSet
          key={`${result.title}-${result.saveIds.join(",")}`}
          result={result}
          sources={sources}
          attachedIds={attachedIds}
          onOpenSave={openSave}
          onAttach={attach}
        />
      ))}
      {message.metadata?.question ? (
        <Question
          question={message.metadata.question}
          answer={questionAnswer}
          disabled={questionDisabled}
          onAnswer={(answer) =>
            void assistant.answerQuestion(message.id, answer, provider)
          }
          onWrite={focus}
        />
      ) : null}
      {message.metadata?.changes?.length ? (
        <ChangeReview
          messageId={message.id}
          changes={message.metadata.changes}
        />
      ) : null}
      {message.metadata?.error ? (
        <p className={styles["change-error"]} role="alert">
          {message.metadata.error}
        </p>
      ) : null}
      {message.metadata?.stopped ? (
        <p className={styles["stopped-label"]}>Response stopped.</p>
      ) : null}
      <div className={styles["response-footer"]}>
        <ToolActivity steps={message.metadata?.steps ?? []} />
        {sources.length ? (
          <button
            type="button"
            className={styles["references-link"]}
            onClick={() => assistant.showReferences(message.id)}
          >
            {sources.length}{" "}
            {sources.length === 1 ? "Save consulted" : "Saves consulted"}
            <IconArrowUpRightOutline18 />
          </button>
        ) : null}
      </div>
      <div className={styles["response-actions"]}>
        {message.content || message.metadata?.results?.length ? (
          <MessageActions
            text={responseText(message)}
            disabled={consent}
            onQuote={() => {
              if (assistant.quote(responseText(message))) attach(sources);
            }}
          />
        ) : null}
        {message.metadata?.stopped || message.metadata?.error ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              assistant.appendDraft("Continue from where you stopped.");
              focus();
            }}
          >
            Continue
          </button>
        ) : null}
      </div>
    </article>
  );
}
