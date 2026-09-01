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
            {question.options.map((option, index) => (
              <button
                type="button"
                key={option}
                disabled={disabled}
                onClick={() => onAnswer(option)}
              >
                <span aria-hidden>{index + 1}</span>
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.write}
            disabled={disabled}
            onClick={onWrite}
          >
            Write an Answer
          </button>
        </>
      )}
    </section>
  );
}
