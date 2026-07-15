import type { Source } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import { clsx as cn } from "clsx";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { useAccounts } from "@/hooks/use-accounts";
import {
  WATCH_NEEDS_SESSION,
  type WatchRow,
  watchKindLabel,
} from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useWatchSource, watchFlow } from "@/stores/watch-flow";
import styles from "./target.module.css";

/** Mirror of the main-process WatchTarget returned by `watches.resolve`. */
interface WatchTargetChip {
  kind: WatchRow["kind"];
  handle: string;
  display: string;
}

function watchHint(source: Source, viaHandle: string | null): string {
  switch (source) {
    case "arena":
      return "A channel, profile, or group — paste a link or type a slug. Public, no sign-in.";
    case "youtube":
      return "A channel handle like @mkbhd, or paste a channel, tab, or playlist link.";
    case "tiktok":
      return "A public profile handle — no sign-in.";
    case "pinterest":
      return "A profile or board — paste a link or type user or user/board. Public, no sign-in.";
    case "cosmos":
      return "A profile or cluster — paste a link or type user or user/cluster. Public, no sign-in.";
    case "twitter":
      return viaHandle
        ? `A profile or list link — checks through your @${viaHandle} session, the account never knows.`
        : "Connect a Twitter account first — watching here rides your own session.";
    default:
      return viaHandle
        ? `Checks through your @${viaHandle} session — the account never knows.`
        : `Connect a ${getSourceDef(source).label} account first — watching here rides your own session.`;
  }
}

/** Handle-entry card for a new watch; a successful add hands the id to the sources page through the watch-flow store. */
export function WatchTargetSection() {
  const dock = useDock();
  const { accounts } = useAccounts();
  const picked = useWatchSource();
  /** Playground previews open this card without a pick; any watchable brand keeps the layout honest. */
  const source = picked ?? "youtube";
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<WatchTargetChip | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dock.isPreview) handleRef.current?.focus();
  }, [dock.isPreview]);

  /** Resolves the input shortly after typing stops; bare Are.na slugs need an API probe. */
  useEffect(() => {
    const input = handle.trim();
    if (!input) {
      setResolved(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const res = (await window.pond.query("watches.resolve", {
          source,
          input,
        })) as { ok: boolean; target?: WatchTargetChip };
        if (!stale) setResolved(res.ok ? (res.target ?? null) : null);
      } catch {
        if (!stale) setResolved(null);
      }
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [source, handle]);

  const viaAccount = accounts.find((a) => a.source === source) ?? null;
  const needsAccount = WATCH_NEEDS_SESSION.includes(source) && !viaAccount;
  const canStart = handle.trim().length > 0 && !needsAccount && !busy;

  const start = async () => {
    if (!canStart) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await window.pond.query("watches.add", {
        source,
        handle: handle.trim(),
      })) as { ok: boolean; reason?: string; watch?: { id: string } };
      if (res.ok && res.watch) {
        watchFlow.added(res.watch.id);
        dock.closeViewMenu();
        return;
      }
      setError(
        res.reason === "already_watching"
          ? "You're already watching this."
          : res.reason === "needs_account"
            ? `Connect a ${getSourceDef(source).label} account first.`
            : res.reason === "invalid"
              ? "Couldn't recognise that handle or link."
              : "Couldn't start watching — try again.",
      );
    } catch {
      setError("Couldn't start watching — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TrayCard.Back onClick={() => dock.openViewMenu("watch-source")} />
      <TrayCard.Close />
      <div className={styles.hero}>
        <span className={styles.avatar}>
          <BrandTile source={source} size={44} />
        </span>
        <TrayCard.Title>Who do you want to watch?</TrayCard.Title>
        <TrayCard.Description>
          {watchHint(source, viaAccount?.handle ?? null)}
        </TrayCard.Description>
      </div>
      <div className={styles.field}>
        {/* The @ prefix only makes sense for bare handles, not links. */}
        {!/[:./]/.test(handle) ? <span className={styles.at}>@</span> : null}
        <input
          ref={handleRef}
          type="text"
          placeholder="handle or link"
          value={handle}
          disabled={needsAccount}
          onChange={(e) => {
            setHandle(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void start();
          }}
        />
      </div>
      {error ? (
        <p className={cn(styles.chip, styles.error)}>{error}</p>
      ) : resolved ? (
        <p className={cn(styles.chip, styles.resolved)}>
          {getSourceDef(source).label} {watchKindLabel(resolved.kind)} ·{" "}
          {resolved.display}
        </p>
      ) : null}
      <TrayCard.Footer>
        <TrayCard.Cancel />
        <TrayCard.Confirm
          disabled={!canStart}
          onClick={(e) => {
            /** Adding closes the tray itself on success and keeps the card open with the error on failure. */
            e.preventDefault();
            void start();
          }}
        >
          {busy ? "Starting…" : "Start Watching"}
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
