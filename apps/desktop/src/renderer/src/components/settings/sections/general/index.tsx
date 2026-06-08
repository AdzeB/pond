import { Button, Settings, useToast } from "@pond/ui";
import { useState } from "react";

export function CheckNowRow() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function checkNow() {
    setBusy(true);
    try {
      const r = (await window.pond.query("updates.checkNow", {})) as
        | { ok: true; version?: string }
        | { ok: false; reason: string };
      if (!r.ok) {
        toast.add({
          title: "Update check failed",
          description:
            r.reason === "dev_build"
              ? "Dev builds don't check the update server. Run a release build."
              : r.reason,
          type: "warning",
        });
        return;
      }
      toast.add({
        title: r.version
          ? `Update available: ${r.version}`
          : "Pond is up to date",
        type: "success",
      });
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
