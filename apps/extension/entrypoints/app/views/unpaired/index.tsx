import { Button, Input } from "@pond/ui";
import { PopupShell } from "../shell";
import styles from "./styles.module.css";

export interface UnpairedViewProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void | Promise<void>;
  busy: boolean;
  error: string | null;
  inputId?: string;
}

export function UnpairedView({
  value,
  onChange,
  onContinue,
  busy,
  error,
  inputId = "pairing-token",
}: UnpairedViewProps) {
  return (
    <PopupShell>
      <div className={styles.heading}>
        <h1 className={styles.title}>Link Pond</h1>
        <p className={styles.subtitle}>
          Paste a pairing token from Pond’s menu bar to start capturing saves.
        </p>
      </div>

      <div className={styles.form}>
        <Input.Root size="lg" className={styles.input}>
          <Input.Field
            id={inputId}
            type="text"
            placeholder="Pairing token"
            value={value}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy && value.trim()) {
                void onContinue();
              }
            }}
          />
        </Input.Root>

        <Button
          variant="primary"
          size="lg"
          width="full"
          disabled={busy || !value.trim()}
          onClick={() => void onContinue()}
        >
          {busy ? "Linking…" : "Continue"}
        </Button>

        {error ? <p className={styles.error}>{error}</p> : null}

        <p className={styles.helper}>
          Menu bar → <strong>Copy Pairing Token</strong>
        </p>
      </div>
    </PopupShell>
  );
}
