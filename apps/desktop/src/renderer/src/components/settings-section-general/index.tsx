import { Button, Settings } from "@pond/ui";
import { useState } from "react";
import { loadAppInfo } from "@/lib/app-info";

export function CheckNowRow() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function checkNow() {
    setBusy(true);
    setMessage(null);
    try {
      const [info, result] = await Promise.all([
        loadAppInfo(),
        window.pond.query("updates.checkNow", {}) as Promise<{
          ok: boolean;
          version?: string;
          reason?: string;
        }>,
      ]);
      if (!result.ok) {
        setMessage(
          result.reason === "dev_build"
            ? "Updates are only available in packaged builds."
            : (result.reason ?? "Could not check for updates."),
        );
        return;
      }
      if (!result.version || result.version === info.version) {
        setMessage(`You're on the latest version (${info.version}).`);
        return;
      }
      setMessage(
        `Update ${result.version} is available and will download in the background.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Check for Updates</Settings.ItemTitle>
        <Settings.ItemDescription>
          Ping the update server for a newer build.
          {message ? (
            <>
              <br />
              <span>{message}</span>
            </>
          ) : null}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button size="sm" onClick={() => void checkNow()} disabled={busy}>
          {busy ? "Checking…" : "Check Now"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}
