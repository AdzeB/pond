"use client";

import { type FormEvent, useState } from "react";
import styles from "./subscribe-form.module.css";

type Status = "idle" | "loading" | "success" | "error";

interface SubscribeFormProps {
  buttonLabel?: string;
  successMessage?: string;
}

export function SubscribeForm({
  buttonLabel = "Request early access",
  successMessage = "You are on the list. Invites go out by email.",
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Something went wrong. Try again in a moment.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setError("Something went wrong. Try again in a moment.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className={styles.success} role="status">
        {successMessage}
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="email"
          name="email"
          placeholder="you@example.com"
          aria-label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") setStatus("idle");
          }}
        />
        <button
          className={styles.submit}
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Sending…" : buttonLabel}
        </button>
      </div>
      {status === "error" ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
