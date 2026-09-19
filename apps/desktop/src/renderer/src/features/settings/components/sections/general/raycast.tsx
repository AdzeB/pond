import { Button, Settings } from "@pond/ui";
import { useState } from "react";

export function RaycastRow() {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyToken() {
    setBusy(true);
    setCopied(false);
    setError(null);
    try {
      const { token } = await window.pond.query("settings.ingestToken", {});
      if (!token) throw new Error("Pond could not read the Local API Token.");
      const result = await window.pond.query("clipboard.writeText", {
        text: token,
      });
      if (!result.ok) throw new Error("Pond could not copy the token.");
      setCopied(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Pond could not copy the token.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Raycast</Settings.ItemTitle>
        <Settings.ItemDescription>
          Connect the Raycast extension to Pond’s local API. Treat this token
          like a password.
          {error ? (
            <>
              <br />
              <span role="alert">{error}</span>
            </>
          ) : null}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          loading={busy}
          onClick={() => void copyToken()}
        >
          {busy ? "Copying" : copied ? "Copied" : "Copy Token"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}
