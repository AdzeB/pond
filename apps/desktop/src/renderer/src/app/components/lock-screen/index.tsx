import { Button, Input } from "@pond/ui";
import type { LibrarySecurityStatus } from "@shared/security-contracts";
import { type FormEvent, useState } from "react";
import { useTranslate } from "@/features/settings/components/localized-text";
import styles from "./styles.module.css";

type UnlockMode = "password" | "recovery";

export function LockScreen({
  status,
  onUnlocked,
}: {
  status: LibrarySecurityStatus;
  onUnlocked: () => void;
}) {
  const translate = useTranslate();
  const [mode, setMode] = useState<UnlockMode>("password");
  const [secret, setSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secret || submitting) return;
    setSubmitting(true);
    setFailed(false);
    try {
      const result =
        mode === "password"
          ? await window.pond.query("security.unlock", { password: secret })
          : await window.pond.query("security.unlockRecovery", {
              recoveryKey: secret,
            });
      if (result.ok) {
        setSecret("");
        onUnlocked();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.root}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{translate("lock.title")}</h1>
          <p className={styles.description}>
            {translate(
              mode === "password"
                ? "lock.description.password"
                : "lock.description.recovery",
            )}
          </p>
        </div>

        <label className={styles.field} htmlFor="library-secret">
          <span className={styles.label}>
            {translate(
              mode === "password"
                ? "lock.label.password"
                : "lock.label.recovery",
            )}
          </span>
          <Input.Root size="lg">
            <Input.Field
              id="library-secret"
              autoFocus
              type={mode === "password" ? "password" : "text"}
              autoComplete={mode === "password" ? "current-password" : "off"}
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
            />
          </Input.Root>
        </label>

        {failed ? (
          <p className={styles.error} role="alert">
            {translate("lock.error")}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          width="full"
          loading={submitting}
          disabled={!secret}
        >
          {translate("lock.unlock")}
        </Button>

        {status.biometricAvailable ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            width="full"
            disabled={submitting}
            onClick={() => {
              setSubmitting(true);
              setFailed(false);
              void window.pond
                .query("security.unlockBiometric", {})
                .then((result) => {
                  if (result.ok) onUnlocked();
                  else setFailed(true);
                })
                .catch(() => setFailed(true))
                .finally(() => setSubmitting(false));
            }}
          >
            {translate("lock.unlockTouchId")}
          </Button>
        ) : null}

        {status.recoveryAvailable ? (
          <Button
            type="button"
            variant="text"
            size="sm"
            onClick={() => {
              setMode((current) =>
                current === "password" ? "recovery" : "password",
              );
              setSecret("");
              setFailed(false);
            }}
          >
            {translate(
              mode === "password" ? "lock.useRecovery" : "lock.usePassword",
            )}
          </Button>
        ) : null}
      </form>
    </main>
  );
}
