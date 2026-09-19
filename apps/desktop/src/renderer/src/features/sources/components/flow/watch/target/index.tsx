import { IconTelescopeFill18 as Telescope } from "@pond/icons/fill/18";
import type { Source, WatchKind } from "@pond/schema/db";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { WATCH_NEEDS_SESSION } from "@/features/sources/hooks/use-watches";
import { getSourceDef } from "@/features/sources/lib/registry";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { useWatchSource, watchFlow } from "@/features/sources/state/watch-flow";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { WatchTargetField } from "../target-field";
import { WatchTargetMatch } from "../target-match";
import { watchInputSource } from "./input-source";
import styles from "./styles.module.css";

const AddWatchResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
  watch: z.object({ id: z.string() }).optional(),
});

interface WatchTargetMatchData {
  kind?: WatchKind;
  handle: string;
  display: string;
  avatarUrl?: string;
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
      avatarUrl: z.url().optional(),
    })
    .optional(),
});

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

function WatchResults({ children }: { children: ReactNode }) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      {...scrollFade}
      className={styles.options}
      role="group"
      aria-label="Account to watch"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  );
}

type WatchOption =
  | { source: Source; status: "checking" | "unavailable" | "failed" }
  | { source: Source; status: "available"; target: WatchTargetMatchData };

interface WatchTargetFormProps {
  source: Source;
  connectedSources: readonly Source[];
  resolveTarget: (
    source: Source,
    input: string,
  ) => Promise<WatchTargetMatchData | null>;
  addWatch: (
    source: Source,
    input: string,
  ) => Promise<z.infer<typeof AddWatchResultSchema>>;
  onAdded: (id: string) => void;
}

async function resolveTarget(source: Source, input: string) {
  const result = ResolveTargetSchema.parse(
    await window.pond.query("watches.resolve", { source, input }),
  );
  return result.ok ? (result.target ?? null) : null;
}

async function addWatch(source: Source, handle: string) {
  return AddWatchResultSchema.parse(
    await window.pond.query("watches.add", { source, handle }),
  );
}

export function WatchTargetSection() {
  const source = useWatchSource();
  const { accounts } = useAccounts();
  if (!source) return null;
  return (
    <WatchTargetForm
      source={source}
      connectedSources={accounts
        .filter((account) => account.connected)
        .map((account) => account.source)}
      resolveTarget={resolveTarget}
      addWatch={addWatch}
      onAdded={(id) => {
        watchFlow.added(id);
        sourceFlow.close();
      }}
    />
  );
}

export function WatchTargetForm({
  source,
  connectedSources,
  resolveTarget,
  addWatch,
  onAdded,
}: WatchTargetFormProps) {
  const label = getSourceDef(source).label;
  const [handle, setHandle] = useState("");
  const input = handle.trim();
  const detected = watchInputSource(input);
  const unsupported =
    detected.type === "unsupported" ||
    (detected.type === "link" && detected.source !== source);
  const [startingSource, setStartingSource] = useState<Source | null>(null);
  const [lookup, setLookup] = useState<{
    input: string;
    options: WatchOption[];
  }>({ input: "", options: [] });
  const options = lookup.input === input ? lookup.options : [];
  const matches = options.filter((option) => option.status === "available");
  const checking =
    !!input &&
    !unsupported &&
    (lookup.input !== input ||
      options.some((option) => option.status === "checking"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!input || unsupported) {
      setLookup({ input, options: [] });
      return;
    }
    setLookup({
      input,
      options: [{ source, status: "checking" }],
    });
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async (): Promise<WatchOption> => {
        try {
          const target = await resolveTarget(source, input);
          return target
            ? { source, status: "available", target }
            : { source, status: "unavailable" };
        } catch {
          return { source, status: "failed" };
        }
      })().then((option) => {
        if (!cancelled) setLookup({ input, options: [option] });
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, source, unsupported, resolveTarget]);

  const needsAccount = (source: Source) =>
    WATCH_NEEDS_SESSION.includes(source) && !connectedSources.includes(source);
  const start = async (source: Source) => {
    if (
      needsAccount(source) ||
      submitting.current ||
      !matches.some((option) => option.source === source)
    )
      return;
    submitting.current = true;
    setBusy(true);
    setStartingSource(source);
    setError(null);
    try {
      const res = await addWatch(source, input);
      if (res.ok && res.watch) {
        onAdded(res.watch.id);
        return;
      }
      setError(
        res.reason === "already_watching"
          ? "You're already watching this."
          : res.reason === "needs_account"
            ? `Connect an account on ${getSourceDef(source).label} first.`
            : res.reason === "invalid"
              ? "Couldn't recognise that handle or link."
              : "Couldn't start watching. Try again.",
      );
    } catch {
      setError("Couldn't start watching. Try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
      setStartingSource(null);
    }
  };

  const changeHandle = (value: string) => {
    setHandle(value);
    setError(null);
  };

  return (
    <>
      <WatchTargetField
        inputRef={handleRef}
        value={handle}
        disabled={busy}
        checking={checking}
        onChange={changeHandle}
      />
      {input && !unsupported ? (
        <WatchResults>
          {matches.map((option) => (
            <WatchTargetMatch
              key={option.source}
              source={option.source}
              match={option.target}
              handle={input}
              disabled={busy || needsAccount(option.source)}
              status={startingSource === option.source ? "Starting" : undefined}
              hint={
                needsAccount(option.source)
                  ? `Connect your ${getSourceDef(option.source).label} account in Sources to watch this profile. Pond needs a signed-in account to check for new posts.`
                  : undefined
              }
              onSelect={() => void start(option.source)}
            />
          ))}
          {checking ? (
            <div
              className={styles.skeletons}
              role="status"
              aria-label="Looking for accounts"
            >
              <div className={styles.skeletonRow} aria-hidden="true">
                <span className={styles.skeletonAvatar} />
                <span className={styles.skeletonText}>
                  <span className={styles.skeletonName} />
                  <span className={styles.skeletonHandle} />
                </span>
              </div>
            </div>
          ) : null}
          {!checking && matches.length === 0 ? (
            <p className={styles.hint} role="status">
              Couldn't find anything. Try another search.
            </p>
          ) : null}
        </WatchResults>
      ) : (
        <div className={styles.body}>
          <div className={styles.empty}>
            <TelescopeSweep />
            <p className={styles.hint}>
              {unsupported
                ? `This link isn't from ${label}. Paste a ${label} link or enter a handle.`
                : `Paste a link or enter a handle\nto start watching on ${label}.`}
            </p>
          </div>
        </div>
      )}
      {error ? (
        <p className={`${styles.chip} ${styles.error}`} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
