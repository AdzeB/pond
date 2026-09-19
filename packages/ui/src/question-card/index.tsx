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
  disabled = false,
}: {
  title: string;
  options: { id: string; label: string; description?: string }[];
  onAnswer: (answer: string) => Promise<void>;
  answered?: string;
  allowFreeform?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!value.trim() || busy || disabled) return;
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
        className={styles["review-card"]}
        aria-label={title}
        aria-busy={busy}
      >
        <div className={styles["card-header"]}>
          <span className={styles.eyebrow}>
            {answered ? "Answered" : "Question"}
          </span>
          <h3>{title}</h3>
        </div>
        {answered ? (
          <p className={styles["card-body"]}>
            {options.find((option) => option.id === answered)?.label ??
              answered}
          </p>
        ) : (
          <>
            <fieldset
              className={styles["question-options"]}
              aria-label="Choose an answer"
            >
              {options.map((option) => (
                <Button
                  key={option.id}
                  variant="ghost"
                  className={styles["question-option"]}
                  aria-pressed={value === option.id}
                  disabled={busy || disabled}
                  onClick={() => setValue(option.id)}
                >
                  <span className={styles["model-content"]}>
                    <span>{option.label}</span>
                    {option.description && (
                      <span className={styles["row-description"]}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  <span className={styles["selection-mark"]}>
                    {value === option.id && <IconCheckOutline18 />}
                  </span>
                </Button>
              ))}
            </fieldset>
            {allowFreeform && (
              <div className={styles["card-body"]}>
                <Input.Root size="sm">
                  <Input.Field
                    aria-label="Your answer"
                    placeholder="Write an answer"
                    disabled={busy || disabled}
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
              <div className={styles["inline-error"]} role="alert">
                {error}
              </div>
            )}
            <div className={styles["card-actions"]}>
              <Button
                size="sm"
                disabled={!value.trim() || busy || disabled}
                loading={busy}
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
