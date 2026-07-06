import type { Source } from "@pond/schema/db";
import { Button, Field, Input } from "@pond/ui";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { sendMessage } from "@/utils/messaging";
import { parsePairingLink } from "@/utils/pairing";
import type { PondSettings } from "@/utils/types";
import { cookieDomainForSource, hostToSource, sourceLabel } from "@/utils/url";
import styles from "./popup.module.css";
import {
  getActiveTabUrl,
  loadSettings,
  type ProbeResult,
  probe,
  saveSettings,
} from "./probe";

type PushResult =
  | { tone: "ok"; label: string }
  | { tone: "error"; label: string }
  | null;

const BRAND_ICON = chrome.runtime.getURL("icons/128.png");

export function App() {
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [pairingInput, setPairingInput] = useState("");
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult>(null);

  const refresh = useCallback(async () => {
    const [settings, url] = await Promise.all([
      loadSettings(),
      getActiveTabUrl(),
    ]);
    setTabUrl(url);
    setProbeResult(await probe(settings));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tabSource: Source | null = tabUrl ? hostToSource(tabUrl) : null;
  const pushable: Source | null =
    tabSource && cookieDomainForSource(tabSource) ? tabSource : null;

  async function applyPairing(): Promise<void> {
    setPairingError(null);
    const parsed = parsePairingLink(pairingInput);
    if (!parsed) {
      setPairingError("That doesn't look like a pond:// pairing link.");
      return;
    }
    setPairingBusy(true);
    try {
      const current = await loadSettings();
      const next: PondSettings = {
        ...current,
        port: parsed.port,
        apiKey: parsed.token,
      };
      await saveSettings(next);
      setPairingInput("");
      const result = await probe(next);
      setProbeResult(result);
      if (result.state !== "connected") {
        setPairingError(
          result.state === "offline"
            ? "Paired, but Pond isn't responding. Make sure the app is running."
            : "Pond rejected that token. Copy the link again from the menu bar.",
        );
      }
    } finally {
      setPairingBusy(false);
    }
  }

  async function pushSessionForTab(): Promise<void> {
    if (!pushable || pushBusy) return;
    setPushBusy(true);
    setPushResult(null);
    try {
      const res = await sendMessage("pushSession", pushable);

      if (res.ok) {
        if (res.data.connected) {
          setPushResult({
            tone: "ok",
            label: `Sent. Pond is connected to ${sourceLabel(pushable)}`,
          });
        } else if (res.data.imported > 0) {
          setPushResult({
            tone: "error",
            label: `Sent ${res.data.imported} cookies but no auth session detected. Sign in first?`,
          });
        } else {
          setPushResult({
            tone: "error",
            label: "No matching cookies on this domain",
          });
        }
        return;
      }
      if (res.reason === "unpaired") {
        setPushResult({
          tone: "error",
          label: "Pair the extension with Pond first",
        });
        void refresh();
      } else if (res.reason === "no_cookies") {
        setPushResult({
          tone: "error",
          label: `No cookies for ${sourceLabel(pushable)}. Sign in first.`,
        });
      } else {
        setPushResult({
          tone: "error",
          label: res.detail || "Couldn't reach Pond",
        });
      }
    } catch (err) {
      setPushResult({
        tone: "error",
        label: err instanceof Error ? err.message : "Push failed",
      });
    } finally {
      setPushBusy(false);
    }
  }

  function openDeepLink(href: string): void {
    void chrome.tabs.create({ url: href, active: true });
    window.close();
  }

  if (!probeResult) {
    return (
      <div className={styles.shell}>
        <Hero title="Pond" sub={<>Connecting…</>} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {probeResult.state === "unpaired" ? (
        <UnpairedBody
          value={pairingInput}
          onChange={setPairingInput}
          onApply={applyPairing}
          busy={pairingBusy}
          error={pairingError}
        />
      ) : null}

      {probeResult.state === "offline" ? (
        <OfflineBody
          onRetry={refresh}
          onOpenPond={() => openDeepLink("pond://")}
        />
      ) : null}

      {probeResult.state === "connected" && pushable ? (
        <PushSessionBody
          source={pushable}
          libraryName={probeResult.library.name}
          busy={pushBusy}
          result={pushResult}
          onPush={pushSessionForTab}
        />
      ) : null}

      {probeResult.state === "connected" && !pushable ? (
        <ConnectedBody
          libraryName={probeResult.library.name}
          activeCount={probeResult.library.counts.active}
        />
      ) : null}

      <hr className={styles.divider} aria-hidden />
      <footer className={styles.footer}>
        <button
          type="button"
          className={styles["footer-link"]}
          onClick={() => openDeepLink("pond://")}
        >
          Open Pond
        </button>
        <span className={styles["footer-separator"]} aria-hidden>
          ·
        </span>
        <button
          type="button"
          className={styles["footer-link"]}
          onClick={() => openDeepLink("pond://settings/general")}
        >
          Settings
        </button>
      </footer>
    </div>
  );
}

interface HeroProps {
  title: string;
  sub: ReactNode;
}

function Hero({ title, sub }: HeroProps) {
  return (
    <div className={styles.hero}>
      <img src={BRAND_ICON} alt="" className={styles.brand} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>{sub}</p>
    </div>
  );
}

interface UnpairedBodyProps {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void | Promise<void>;
  busy: boolean;
  error: string | null;
}

function UnpairedBody({
  value,
  onChange,
  onApply,
  busy,
  error,
}: UnpairedBodyProps) {
  return (
    <>
      <Hero title="Pair with Pond" sub="to sync this tab to your library" />
      <div className={styles.block}>
        <Field.Root>
          <Field.Label htmlFor="pairing">Pairing link</Field.Label>
          <Input.Field
            id="pairing"
            data-variant="code"
            type="text"
            placeholder="pond://pair?port=41610&token=…"
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) void onApply();
            }}
          />
          {error ? <p className={styles["pairing-error"]}>{error}</p> : null}
        </Field.Root>
      </div>
      <Button
        variant="primary"
        size="lg"
        className={styles.cta}
        disabled={busy || !value.trim()}
        onClick={() => void onApply()}
      >
        {busy ? "Pairing…" : "Pair"}
      </Button>
      <p className={styles.helper}>
        Open the Pond menu bar icon → <strong>Copy Pairing Token</strong>
      </p>
    </>
  );
}

interface OfflineBodyProps {
  onRetry: () => void | Promise<void>;
  onOpenPond: () => void;
}

function OfflineBody({ onRetry, onOpenPond }: OfflineBodyProps) {
  return (
    <>
      <Hero
        title="Pond isn't running"
        sub="Start the app to keep saves in sync"
      />
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          className={styles.cta}
          onClick={onOpenPond}
        >
          Open Pond
        </Button>
        <Button
          variant="ghost"
          className={styles.ghost}
          onClick={() => void onRetry()}
        >
          Try again
        </Button>
      </div>
      <p className={styles.helper}>
        Bookmarks and likes won't sync until Pond is back
      </p>
    </>
  );
}

interface PushSessionBodyProps {
  source: Source;
  libraryName: string;
  busy: boolean;
  result: PushResult;
  onPush: () => void | Promise<void>;
}

function PushSessionBody({
  source,
  libraryName,
  busy,
  result,
  onPush,
}: PushSessionBodyProps) {
  const label = sourceLabel(source);
  return (
    <>
      <Hero
        title={`Push your ${label} session`}
        sub={
          <>
            to <strong>{libraryName}</strong>
          </>
        }
      />
      <div className={styles.block}>
        <div className={styles["block-row"]}>
          <span aria-hidden className={styles["block-dot"]} />
          <span>
            Pond uses your {label} cookies to scrape on your behalf, with no
            embedded sign-in window
          </span>
        </div>
        <div className={styles["block-row"]}>
          <span aria-hidden className={styles["block-dot"]} />
          <span>Sign in to {label} in this tab first, then push</span>
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        className={styles.cta}
        disabled={busy}
        onClick={() => void onPush()}
      >
        {busy ? "Sending…" : `Push ${label} session`}
      </Button>
      {result ? (
        <p className={styles.helper} data-tone={result.tone}>
          {result.label}
        </p>
      ) : null}
    </>
  );
}

interface ConnectedBodyProps {
  libraryName: string;
  activeCount: number;
}

function ConnectedBody({ libraryName, activeCount }: ConnectedBodyProps) {
  return (
    <Hero
      title={`Connected to ${libraryName}`}
      sub={<>{formatCount(activeCount)} in your library</>}
    />
  );
}

function formatCount(n: number): string {
  if (n < 1000) return `${n} saves`;
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k saves`;
  return `${Math.round(n / 1000)}k saves`;
}
