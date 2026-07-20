import {
  IconCircleCheckFill18 as MatchCheck,
  IconTelescopeFill18 as Telescope,
} from "@pond/icons/fill/18";
import type { Source, WatchKind } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import { Calligraph } from "calligraph";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { useAccounts } from "@/hooks/use-accounts";
import {
  WATCH_NEEDS_SESSION,
  watchKindLabel,
  watchKindsFor,
} from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useWatchKind, useWatchSource, watchFlow } from "@/stores/watch-flow";
import styles from "./target.module.css";

/** Mirrors the main-process WatchTarget from `watches.resolve`. */
interface WatchTargetMatch {
  kind?: WatchKind;
  handle: string;
  display: string;
}

const KIND_TITLES: Record<WatchKind, string> = {
  user: "Watch an Account",
  channel: "Watch a Channel",
  group: "Watch a Group",
  playlist: "Watch a Playlist",
  board: "Watch a Board",
  cluster: "Watch a Cluster",
  list: "Watch a List",
};

function watchHint(
  source: Source,
  kind: WatchKind,
  viaHandle: string | null,
): string {
  if (WATCH_NEEDS_SESSION.includes(source) && !viaHandle) {
    return `Connect a ${getSourceDef(source).label} account first. Watching here rides your own session.`;
  }
  switch (kind) {
    case "channel":
      return "Search a handle or paste a link to\nstart watching a channel.";
    case "group":
      return "Search a slug or paste a link to\nstart watching a group.";
    case "playlist":
      return "Paste a playlist link to\nstart watching it.";
    case "board":
      return "Type user/board or paste a link to\nstart watching a board.";
    case "cluster":
      return "Type user/cluster or paste a link to\nstart watching a cluster.";
    case "list":
      return "Paste a list link to\nstart watching it.";
    default:
      return "Search a handle to\nstart watching a public account.";
  }
}

function watchPlaceholder(kind: WatchKind): string {
  switch (kind) {
    case "channel":
      return "Search Channels…";
    case "group":
      return "Search Groups…";
    case "playlist":
      return "Paste a playlist link…";
    case "board":
      return "Search Boards…";
    case "cluster":
      return "Search Clusters…";
    case "list":
      return "Paste a list link…";
    default:
      return "Search Accounts…";
  }
}

/** Repeating the handle under an identical display name reads as a glitch; fall back to the source and kind. */
function matchSub(source: Source, match: WatchTargetMatch): string {
  const handleText = /[:./]/.test(match.handle)
    ? match.handle
    : `@${match.handle}`;
  const kind = watchKindLabel(match.kind);
  return handleText === match.display
    ? `${getSourceDef(source).label} ${kind}`
    : `${handleText} · ${kind}`;
}

/** The idle telescope slowly scans the horizon, hinting at what watching does. */
function TelescopeSweep() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      style={{ display: "inline-flex", transformOrigin: "50% 80%" }}
      animate={reduce ? undefined : { rotate: [0, -9, 6, -3, 0] }}
      transition={
        reduce
          ? undefined
          : {
              duration: 7,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 2,
              ease: "easeInOut",
            }
      }
      aria-hidden
    >
      <Telescope width={24} height={24} />
    </motion.span>
  );
}

/** Handle-entry card for a new watch; a successful add hands the id to the sources page through the watch-flow store. */
export function WatchTargetSection() {
  const dock = useDock();
  const { accounts } = useAccounts();
  const picked = useWatchSource();
  /** The pick clears before the card swaps out; any watchable brand keeps the exit render intact. */
  const source = picked ?? "youtube";
  const kinds = watchKindsFor(source);
  const pickedKind = useWatchKind();
  const kind = pickedKind ?? kinds[0] ?? "user";
  const [handle, setHandle] = useState("");
  const [resolved, setResolved] = useState<WatchTargetMatch | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handleRef.current?.focus();
  }, []);

  const viaAccount = accounts.find((a) => a.source === source) ?? null;
  const needsAccount = WATCH_NEEDS_SESSION.includes(source) && !viaAccount;

  useEffect(() => {
    const input = handle.trim();
    setResolved(null);
    if (!input || needsAccount) {
      setChecking(false);
      return;
    }
    setChecking(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = (await window.pond.query("watches.resolve", {
          source,
          input,
        })) as { ok: boolean; target?: WatchTargetMatch };
        if (!cancelled && res.ok && res.target) setResolved(res.target);
      } catch {
        /** Resolution is a preview; add re-resolves and reports its own errors. */
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, source, needsAccount]);

  const canStart =
    resolved !== null && handle.trim().length > 0 && !needsAccount && !busy;

  const start = async () => {
    if (handle.trim().length === 0 || needsAccount || busy) return;
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
              : "Couldn't start watching. Try again.",
      );
    } catch {
      setError("Couldn't start watching. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setHandle(text.trim());
        setError(null);
      }
    } finally {
      handleRef.current?.focus();
    }
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back
          onClick={() =>
            dock.openViewMenu(kinds.length > 1 ? "watch-kind" : "watch-source")
          }
        />
        <TrayCard.Title position="center">
          {kinds.length > 1
            ? KIND_TITLES[kind]
            : `Watch on ${getSourceDef(source).label}`}
        </TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.field}>
        <input
          ref={handleRef}
          type="text"
          placeholder={watchPlaceholder(kind)}
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
        {checking ? <span className={styles["field-spinner"]} /> : null}
        <button
          type="button"
          className={styles.paste}
          disabled={needsAccount}
          onClick={() => void paste()}
        >
          Paste
        </button>
      </div>
      <div
        className={styles.body}
        data-state={
          error
            ? "error"
            : resolved
              ? "match"
              : checking
                ? "checking"
                : handle.trim() && !needsAccount
                  ? "none"
                  : "hint"
        }
      >
        {error ? (
          <p className={`${styles.chip} ${styles.error}`}>{error}</p>
        ) : resolved ? (
          <div className={styles.match}>
            <span className={styles.eyebrow}>Exact match</span>
            <div className={styles.row}>
              <span className={styles.avatar}>
                <BrandTile source={source} size={32} />
              </span>
              <span className={styles.meta}>
                <span className={styles.name}>{resolved.display}</span>
                <span className={styles.sub}>{matchSub(source, resolved)}</span>
              </span>
              <MatchCheck className={styles.tick} width={18} height={18} />
            </div>
          </div>
        ) : checking ? (
          <div className={styles.skeleton} aria-hidden="true">
            <div className={styles["skeleton-row"]}>
              <span className={styles["skeleton-circle"]} />
              <span className={styles["skeleton-bars"]}>
                <span
                  className={styles["skeleton-bar"]}
                  style={{ width: 120 }}
                />
                <span
                  className={styles["skeleton-bar"]}
                  style={{ width: 84 }}
                />
              </span>
            </div>
            <div className={styles["skeleton-row"]}>
              <span className={styles["skeleton-circle"]} />
              <span className={styles["skeleton-bars"]}>
                <span
                  className={styles["skeleton-bar"]}
                  style={{ width: 150 }}
                />
                <span
                  className={styles["skeleton-bar"]}
                  style={{ width: 96 }}
                />
              </span>
            </div>
          </div>
        ) : handle.trim() && !needsAccount ? (
          <div className={styles["no-match"]}>No results found</div>
        ) : (
          <div className={styles.empty}>
            <TelescopeSweep />
            <p className={styles.hint}>
              {watchHint(source, kind, viaAccount?.handle ?? null)}
            </p>
          </div>
        )}
      </div>
      <TrayCard.Footer>
        <TrayCard.Confirm
          disabled={!canStart}
          onClick={(e) => {
            /** Adding closes the tray itself on success and keeps the card open with the error on failure. */
            e.preventDefault();
            void start();
          }}
        >
          <Calligraph>{busy ? "Starting" : "Start Watching"}</Calligraph>
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
