import { IconCheckOutline18 } from "@pond/icons/outline/18";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Reveal } from "../reveal";
import styles from "./styles.module.css";

export function QuestionCard({
  title,
  options,
  onAnswer,
  answered,
  allowFreeform = true,
}: {
  title: string;
  options: { id: string; label: string; description?: string }[];
  onAnswer: (answer: string) => Promise<void>;
  answered?: string;
  allowFreeform?: boolean;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAnswer(value);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn't send your answer. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Reveal>
      <section
        className={styles.reviewCard}
        aria-label={title}
        aria-busy={busy}
      >
        <div className={styles.cardHeader}>
          <span className={styles.eyebrow}>
            {answered ? "Answered" : "Question"}
          </span>
          <h3>{title}</h3>
        </div>
        {answered ? (
          <p className={styles.cardBody}>
            {options.find((option) => option.id === answered)?.label ??
              answered}
          </p>
        ) : (
          <>
            <fieldset
              className={styles.questionOptions}
              aria-label="Choose an answer"
            >
              {options.map((option) => (
                <Button
                  key={option.id}
                  variant="ghost"
                  className={styles.questionOption}
                  aria-pressed={value === option.id}
                  disabled={busy}
                  onClick={() => setValue(option.id)}
                >
                  <span className={styles.modelContent}>
                    <span>{option.label}</span>
                    {option.description && (
                      <span className={styles.rowDescription}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  <span className={styles.selectionMark}>
                    {value === option.id && <IconCheckOutline18 />}
                  </span>
                </Button>
              ))}
            </fieldset>
            {allowFreeform && (
              <div className={styles.cardBody}>
                <Input.Root size="sm">
                  <Input.Field
                    aria-label="Your answer"
                    placeholder="Write an answer"
                    disabled={busy}
                    value={
                      options.some((option) => option.id === value) ? "" : value
                    }
                    onValueChange={setValue}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                  />
                </Input.Root>
              </div>
            )}
            {error && (
              <div className={styles.inlineError} role="alert">
                {error}
              </div>
            )}
            <div className={styles.cardActions}>
              <Button
                size="sm"
                disabled={!value.trim() || busy}
                onClick={() => void submit()}
              >
                {busy ? "Sending" : "Continue"}
              </Button>
            </div>
          </>
        )}
      </section>
    </Reveal>
  );
}
