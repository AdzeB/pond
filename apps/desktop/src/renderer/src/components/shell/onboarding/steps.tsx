import type { Source } from "@pond/schema/db";
import { EXTERNAL_SOURCE_IDS } from "@pond/schema/sources";
import { Button, Field, Input } from "@pond/ui";
import { motion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { SourcePicker } from "@/components/shared/source-picker";
import styles from "./styles.module.css";

export type Step = "welcome" | "create-pond" | "connect-source";

export const STEPS: Step[] = ["welcome", "create-pond", "connect-source"];

const stepVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.7, bounce: 0 },
  },
};

const stepExit = {
  opacity: 0,
  y: -12,
  filter: "blur(6px)",
  transition: { type: "spring", duration: 0.35, bounce: 0 },
} as const;

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.span className={styles.mark} variants={rise} aria-hidden>
        <span className={styles["mark-ring"]} />
      </motion.span>
      <motion.h1 className={styles.title} variants={rise}>
        Your library awaits.
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Pond is a calm, local home for everything worth keeping. Links, images,
        videos, and files, saved on your Mac.
      </motion.p>
      <motion.div className={styles.actions} variants={rise}>
        <Button variant="accent" size="lg" onClick={onNext} width="full">
          Get Started
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function CreatePondStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("My Pond");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.pond
      .query("library.info", {})
      .then((info) => {
        const root = (info as { path?: string })?.path ?? "";
        const parent = root.replace(/\/[^/]+\.pond\/?$/, "");
        if (parent) setFolder(parent);
        else setFolder("~/Pond");
      })
      .catch(() => {
        setFolder("~/Pond");
      });
  }, []);

  const pickFolder = async () => {
    const res = (await window.pond.query("library.pickFolder", {})) as {
      ok: boolean;
      path?: string;
    };
    if (res.ok && res.path) setFolder(res.path);
  };

  const create = async () => {
    if (!name.trim() || !folder.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await window.pond.query("library.createAt", {
        name: name.trim(),
        path: folder.trim(),
      })) as { ok: boolean; reason?: string };
      if (res.ok) {
        onNext();
      } else {
        setError(
          res.reason === "not_writable"
            ? "That folder isn't writable. Pick another location."
            : "Couldn't create the pond. Try a different folder.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      key="create-pond"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        Create Your Pond
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Give it a name and choose where it lives on your Mac.
      </motion.p>
      <motion.div className={styles["form-fields"]} variants={rise}>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input.Root size="lg" variant="secondary">
            <Input.Field
              value={name}
              placeholder="My Pond"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void create();
                }
              }}
            />
          </Input.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label>Location</Field.Label>
          <Input.Root size="lg" variant="secondary">
            <Input.Field
              value={folder}
              placeholder="~/Pond"
              readOnly
              onClick={() => void pickFolder()}
              style={{ cursor: "pointer" }}
            />
          </Input.Root>
        </Field.Root>
      </motion.div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <motion.div className={styles.actions} variants={rise}>
        <Button
          variant="accent"
          size="lg"
          disabled={!name.trim() || !folder.trim() || busy}
          onClick={() => void create()}
          width="full"
        >
          {busy ? "Creating..." : "Continue"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function ConnectSourceStep({ onDone }: { onDone: () => void }) {
  const [connecting, setConnecting] = useState<Source | null>(null);

  const handlePick = (source: Source) => {
    setConnecting(source);
    void window.pond.connectSource(source);
  };

  return (
    <motion.div
      key="connect-source"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        Connect a Source
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Pick a platform to sync your saves from. You'll sign in through your
        browser, and the extension sends your session to Pond.
      </motion.p>
      <motion.div className={styles["source-grid-wrap"]} variants={rise}>
        {connecting ? (
          <div className={styles["connect-waiting"]}>
            <span className={styles["connect-waiting-ring"]} />
            <span className={styles["connect-waiting-text"]}>
              Waiting for sign-in...
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={styles.skip}
              onClick={() => setConnecting(null)}
            >
              Try another
            </Button>
          </div>
        ) : (
          <SourcePicker sources={EXTERNAL_SOURCE_IDS} onPick={handlePick} />
        )}
      </motion.div>
      <motion.div variants={rise} className={styles.skip}>
        <Button variant="ghost" size="sm" onClick={onDone}>
          I'll set this up later
        </Button>
      </motion.div>
    </motion.div>
  );
}
