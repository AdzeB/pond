import type { Source } from "@pond/schema/db";
import { useCallback, useEffect, useState } from "react";
import { tryAutoLink } from "@/utils/auto-link";
import { sendMessage } from "@/utils/messaging";
import { parsePairingInput } from "@/utils/pairing";
import {
  loadSettings,
  type ProbeResult,
  probe,
  saveSettings,
} from "@/utils/probe";
import type { PondSettings } from "@/utils/types";
import { cookieDomainForSource, hostToSource, sourceLabel } from "@/utils/url";
import { ConnectScreen, IdleScreen, LoadingScreen, TokenScreen } from "./views";

export function App() {
  const [ready, setReady] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectDismissed, setConnectDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [settings, tabs] = await Promise.all([
        loadSettings(),
        chrome.tabs.query({ active: true, currentWindow: true }),
      ]);
      const url = tabs[0]?.url ?? null;
      setTabUrl(url && !url.startsWith("chrome-extension://") ? url : null);

      let nextSettings = settings;
      if (!settings.apiKey) {
        const linked = await tryAutoLink();
        if (linked) nextSettings = linked;
      }

      setProbeResult(await probe(nextSettings));
    } catch (err) {
      console.warn("[pond] popup probe failed", err);
      setProbeResult({ state: "unpaired" });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tabSource: Source | null = tabUrl ? hostToSource(tabUrl) : null;
  const pushable: Source | null =
    tabSource && cookieDomainForSource(tabSource) ? tabSource : null;

  async function applyToken(): Promise<void> {
    setTokenError(null);
    const current = await loadSettings();
    const parsed = parsePairingInput(tokenInput, current.port);
    if (!parsed) {
      setTokenError("That doesn't look like a Pond pairing token.");
      return;
    }
    setTokenBusy(true);
    try {
      const next: PondSettings = {
        ...current,
        port: parsed.port,
        apiKey: parsed.token,
      };
      await saveSettings(next);
      const result = await probe(next);
      setProbeResult(result);
      if (result.state === "offline") {
        setTokenError(
          "Linked, but Pond isn't responding. Make sure the app is running.",
        );
      } else if (result.state === "unpaired") {
        setTokenError("Pond rejected that token. Copy a fresh one.");
      } else {
        setTokenInput("");
      }
    } finally {
      setTokenBusy(false);
    }
  }

  async function connectSource(): Promise<void> {
    if (!pushable || connectBusy) return;
    setConnectBusy(true);
    setConnectError(null);
    try {
      const res = await sendMessage("pushSession", pushable);
      if (res.ok && res.data.connected) {
        setConnectDismissed(true);
        return;
      }
      if (res.ok) {
        setConnectError(
          res.data.imported > 0
            ? "Cookies sent, but no auth session detected. Sign in first?"
            : "No matching cookies on this domain.",
        );
        return;
      }
      if (res.reason === "unpaired") {
        setConnectError("Link the extension with Pond first.");
        void refresh();
      } else if (res.reason === "no_cookies") {
        setConnectError(
          `No cookies for ${sourceLabel(pushable)}. Sign in first.`,
        );
      } else {
        setConnectError(res.detail || "Couldn't reach Pond.");
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setConnectBusy(false);
    }
  }

  if (!ready || !probeResult) {
    return <LoadingScreen />;
  }

  if (probeResult.state === "unpaired") {
    return (
      <TokenScreen
        value={tokenInput}
        onChange={setTokenInput}
        onContinue={applyToken}
        busy={tokenBusy}
        error={tokenError}
      />
    );
  }

  if (probeResult.state === "offline") {
    return <IdleScreen libraryName="Pond" offline onRetry={refresh} />;
  }

  if (pushable && !connectDismissed) {
    return (
      <ConnectScreen
        source={pushable}
        busy={connectBusy}
        error={connectError}
        onConnect={connectSource}
        onCancel={() => setConnectDismissed(true)}
      />
    );
  }

  return (
    <IdleScreen libraryName={probeResult.library.name} onRetry={refresh} />
  );
}
