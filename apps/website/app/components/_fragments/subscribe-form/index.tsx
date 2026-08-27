"use client";

import { Button, Input } from "@pond/ui";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import styles from "./styles.module.css";

type Status = "idle" | "loading" | "success" | "error";

interface SubscribeFormProps {
  buttonLabel?: string;
  successMessage?: string;
}

const ErrorBodySchema = z.object({
  error: z.string().optional().catch(undefined),
});

export function SubscribeForm({
  buttonLabel = "Request Early Access",
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
        const body = ErrorBodySchema.safeParse(await response.json());
        setError(
          body.data?.error ?? "Couldn't subscribe. Try again in a moment.",
        );
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setError("Couldn't subscribe. Try again in a moment.");
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
        <Input.Root className={styles.input} size="lg" variant="secondary">
          <Input.Field
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
        </Input.Root>
        <Button type="submit" size="lg" disabled={status === "loading"}>
          {status === "loading" ? "Sending" : buttonLabel}
        </Button>
      </div>
      {status === "error" ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
