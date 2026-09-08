import { Button } from "@pond/ui";
import type { AssistantQuestion } from "@shared/assistant";
import { useId } from "react";
import styles from "./question.module.css";

export function Question({
  question,
  answer,
  disabled,
  onAnswer,
  onWrite,
}: {
  question: AssistantQuestion;
  answer?: string;
  disabled: boolean;
  onAnswer: (value: string) => void;
  onWrite: () => void;
}) {
  const id = useId();
  return (
    <section className={styles.question} aria-labelledby={id}>
      <p id={id} className={styles.title}>
        {question.question}
      </p>
      {answer ? (
        <p className={styles.resolved}>Answered: {answer}</p>
      ) : (
        <>
          <div className={styles.options}>
            {question.options.map((option) => (
              <Button
                size="sm"
                variant="secondary"
                className={styles.option}
                key={option}
                disabled={disabled}
                onClick={() => onAnswer(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className={styles.write}
            disabled={disabled}
            onClick={onWrite}
          >
            Write an Answer
          </Button>
        </>
      )}
    </section>
  );
}
