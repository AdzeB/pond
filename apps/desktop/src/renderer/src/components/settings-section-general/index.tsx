import { Button, Settings } from "@pond/ui";
import { useState } from "react";

export function CheckNowRow() {
  const [busy, setBusy] = useState(false);

  async function checkNow() {
    setBusy(true);
    try {
      await window.pond.query("updates.checkNow", {});
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
