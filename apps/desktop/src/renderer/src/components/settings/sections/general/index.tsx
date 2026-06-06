import { Button, Settings, useToast } from "@pond/ui";
import { useEffect, useMemo, useState } from "react";
import { usePrefs } from "@/pool/prefs";

const REPO_URL = "https://github.com/raphaelsalaja/pond";

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

export function PairingLinkRow() {
  const toast = useToast();
  const [apiPrefs] = usePrefs("api");
  const [ingestToken, setIngestToken] = useState<string | null>(null);

  useEffect(() => {
    void window.pond
      .query("settings.ingestToken", {})
      .then((t) => setIngestToken((t as { token?: string }).token ?? null));
  }, []);

  const pairingLink = useMemo(() => {
    if (!ingestToken) return "";
    const u = new URL("pond://pair");
    u.searchParams.set("port", String(apiPrefs.port || 41610));
    u.searchParams.set("token", ingestToken);
    return u.toString();
  }, [ingestToken, apiPrefs.port]);

  function copyPairingLink() {
    if (!pairingLink) return;
    void navigator.clipboard.writeText(pairingLink);
    toast.add({ title: "Pairing link copied", type: "success" });
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Pairing Link</Settings.ItemTitle>
        <Settings.ItemDescription>
          Copy this and paste it into the Pond extension to pair.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button size="sm" disabled={!pairingLink} onClick={copyPairingLink}>
          Copy Link
        </Button>
      </Settings.ItemControl>
    </>
  );
}

export function InstallInstructionsRow() {
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Install Instructions</Settings.ItemTitle>
        <Settings.ItemDescription>Build from source.</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          onClick={() => void window.pond.openExternal(REPO_URL)}
        >
          Open Repo
        </Button>
      </Settings.ItemControl>
    </>
  );
}
