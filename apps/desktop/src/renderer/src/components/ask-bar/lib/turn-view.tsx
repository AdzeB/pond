import { IconSparkle3Fill18 as Sparkle } from "@pond/icons/fill/18";
import { Calligraph } from "calligraph";
import { AskChip } from "@/components/ask-bar-chip";
import { runAskSuggestion } from "@/hooks/use-ask";
import { formatNumber } from "@/lib/util/format";
import type { AskSegment, AskTurn } from "@/stores/ask-store";
import styles from "../styles.module.css";
import { STAGE_LABELS } from "./stage-labels";

function TurnSegment({ segment }: { segment: AskSegment }) {
  if (segment.kind === "text") return <>{segment.text}</>;
  if (segment.kind === "mention") {
    return (
      <AskChip
        tone="mention"
        lead="@"
        label={segment.title}
        title={`@${segment.title}`}
      />
    );
  }
  if (segment.kind === "tag") {
    return (
      <AskChip
        tone="tag"
        lead="#"
        label={segment.tag}
        title={`#${segment.tag}`}
      />
    );
  }
  return (
    <AskChip
      tone="skill"
      lead={<Sparkle width={13} height={13} />}
      label={`/${segment.name}`}
    />
  );
}

export function TurnView({
  turn,
  onRetry,
}: {
  turn: AskTurn;
  onRetry?: () => void;
}) {
  const busy = turn.status === "thinking" || turn.summaryStatus === "loading";
  const stageLabel = turn.stage ? STAGE_LABELS[turn.stage] : "Thinking";
  const hasAnswer = turn.answer.length > 0;
  const hasSummary = turn.summaryStatus === "done" && turn.summary.length > 0;
  const showSuggestions =
    turn.status === "done" &&
    turn.count === 0 &&
    !hasAnswer &&
    turn.suggestions.length > 0;

  return (
    <div className={styles.turn}>
      <div className={styles["user-message"]}>
        {turn.image ? (
          <img className={styles["user-image"]} src={turn.image.url} alt="" />
        ) : null}
        {turn.segments.length > 0 ? (
          <span className={styles["user-text"]}>
            {turn.segments.map((seg, i) => (
              /** Segments are a fixed snapshot of the sent message, so the index is a stable identity. */
              // biome-ignore lint/suspicious/noArrayIndexKey: positional segments
              <TurnSegment key={`${seg.kind}-${i}`} segment={seg} />
            ))}
          </span>
        ) : turn.question ? (
          <span className={styles["user-text"]}>{turn.question}</span>
        ) : null}
      </div>

      <div className={styles["assistant-message"]}>
        <div className={styles["turn-status"]}>
          {busy ? (
            <span className={styles["status-line"]} role="status">
              <span className={styles.shimmer}>{stageLabel}</span>
            </span>
          ) : turn.status === "error" ? (
            <span className={styles["status-line"]}>
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
            hasAnswer ? null : (
              <span className={styles["status-line"]}>No matches</span>
            )
          ) : (
            <span className={styles["status-line"]}>
              <Calligraph className={styles.count} variant="number">
                {formatNumber(turn.count)}
              </Calligraph>
              <span className={styles["result-label"]}>found</span>
            </span>
          )}
        </div>

        {hasAnswer ? (
          <p className={styles["turn-body"]}>{turn.answer}</p>
        ) : null}

        {hasSummary && !hasAnswer ? (
          <p className={styles["turn-body"]}>{turn.summary}</p>
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
                <span className={styles["suggestion-count"]}>{s.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
