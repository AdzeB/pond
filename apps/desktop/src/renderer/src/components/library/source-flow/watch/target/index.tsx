import { IconTelescopeFill18 as Telescope } from "@pond/icons/fill/18";
import type { Source, WatchKind } from "@pond/schema/db";
import { PageDialog } from "@pond/ui";
import { Calligraph } from "calligraph";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAccounts } from "@/hooks/use-accounts";
import { WATCH_NEEDS_SESSION, watchKindsFor } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { sourceFlow } from "@/stores/source-flow";
import { useWatchKind, useWatchSource, watchFlow } from "@/stores/watch-flow";
import { WatchTargetField } from "../target-field";
import { WatchTargetMatch } from "../target-match";
import { WatchTargetSkeleton } from "../target-skeleton";
import styles from "./styles.module.css";

interface WatchTargetMatchData {
  kind?: WatchKind;
  handle: string;
  display: string;
}

const ResolveTargetSchema = z.object({
  ok: z.boolean(),
  target: z
    .object({
      kind: z
        .enum([
          "channel",
          "user",
          "group",
          "playlist",
          "board",
          "cluster",
          "list",
        ])
        .optional(),
      handle: z.string(),
      display: z.string(),
    })
    .optional(),
});

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

export function WatchTargetSection() {
  const { accounts } = useAccounts();
  const picked = useWatchSource();
  const source = picked ?? "youtube";
  const kinds = watchKindsFor(source);
  const pickedKind = useWatchKind();
  const kind = pickedKind ?? kinds[0] ?? "user";
  const [handle, setHandle] = useState("");
  const [resolved, setResolved] = useState<WatchTargetMatchData | null>(null);
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
        const res = ResolveTargetSchema.parse(
          await window.pond.query("watches.resolve", { source, input }),
        );
        if (!cancelled && res.ok && res.target) setResolved(res.target);
      } catch {
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
        sourceFlow.close();
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
      <WatchTargetField
        inputRef={handleRef}
        kind={kind}
        value={handle}
        disabled={needsAccount}
        checking={checking}
        onChange={(value) => {
          setHandle(value);
          setError(null);
        }}
        onSubmit={() => void start()}
        onPaste={() => void paste()}
      />
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
          <WatchTargetMatch source={source} match={resolved} />
        ) : checking ? (
          <WatchTargetSkeleton />
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
      <PageDialog.Footer>
        <PageDialog.Confirm disabled={!canStart} onClick={() => void start()}>
          <Calligraph>{busy ? "Starting" : "Start Watching"}</Calligraph>
        </PageDialog.Confirm>
      </PageDialog.Footer>
    </>
  );
}
