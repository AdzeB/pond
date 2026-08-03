import { Button } from "@pond/ui";
import styles from "./styles.module.css";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}

function stackOf(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/** Keeps the full stack one click away so crashes stay diagnosable instead of vanishing behind a generic page. */
export function ErrorScreen({
  error,
  reset,
  componentStack,
}: {
  error: unknown;
  reset?: () => void;
  componentStack?: string | null;
}) {
  const message = messageOf(error);
  const stack = stackOf(error);
  const hasDetails = Boolean(stack || componentStack);

  return (
    <div className={styles.root} role="alert">
      <div className={styles.card}>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>{message}</p>

        {hasDetails ? (
          <details className={styles.details}>
            <summary className={styles.summary}>Technical details</summary>
            <pre className={styles.stack}>
              {[stack, componentStack].filter(Boolean).join("\n\n")}
            </pre>
          </details>
        ) : null}

        <div className={styles.actions}>
          {reset ? (
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
          ) : null}
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    </div>
  );
}
