import { Button } from "@pond/ui";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Onboarding } from "@/components/onboarding";
import { markOnboardedLocally, wasOnboardedLocally } from "@/lib/onboarded";
import styles from "./welcome.module.css";

interface Step {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -28 : 28 }),
};

function Welcome() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [libraryPath, setLibraryPath] = useState<string | null>(null);

  const steps: ReadonlyArray<Step & { body: ReactNode }> = [
    {
      id: "intro",
      title: "Welcome to Pond",
      body: <Onboarding.Intro />,
    },
    {
      id: "library",
      title: "Pick where your pond lives",
      description: "Pond stores your saves on disk so you keep full control.",
      body: (
        <Onboarding.LibraryLocationStep
          chosenPath={libraryPath}
          onChoose={setLibraryPath}
        />
      ),
    },
    {
      id: "extension",
      title: "Install the browser extension",
      description: "This is how pages get into Pond.",
      body: <Onboarding.ExtensionStep />,
    },
    {
      id: "pair",
      title: "Pair it with this app",
      description: "Connect the extension to this Mac.",
      body: <Onboarding.PairingStep />,
    },
    {
      id: "sync",
      title: "Sync your connected apps",
      description:
        "Already have bookmarks elsewhere? Pull your history into your pond.",
      optional: true,
      body: <Onboarding.SyncPanel />,
    },
  ];

  const total = steps.length;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;
  // The library step requires a created or adopted pond before moving on.
  const canAdvance = current?.id !== "library" || libraryPath !== null;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setDirection(clamped >= step ? 1 : -1);
    setStep(clamped);
  }

  function finish() {
    // Record completion first (sync): the boot-time shell hint is frozen
    // by contextBridge so we can't flip it in place. The root + welcome
    // guards read this to stop sending us back to /welcome.
    markOnboardedLocally();
    // Persist to the DB in the background so nothing here can block or
    // throw before we navigate.
    void window.pond.query("settings.markOnboarded", { value: true });
    // Apply the chosen pond last, so picking a spot never relaunched the
    // app mid-wizard. `switchTo` (custom location) or `ensureDefault`
    // (default) both resolve before we leave the wizard. Always navigate to
    // the library afterwards: in dev the switch soft-reloads the window,
    // which lands back on /welcome, and only this nav (plus the welcome
    // guard) moves us into the library.
    const open = libraryPath
      ? window.pond.query("library.switchTo", { path: libraryPath })
      : window.pond.query("library.ensureDefault", {});
    void open.finally(() => void nav({ to: "/" }));
  }

  if (!current) return null;

  return (
    <div className={styles.wizard}>
      <header className={styles.header}>
        <div className={styles.progress} aria-hidden>
          <span
            className={styles["progress-fill"]}
            style={{ transform: `scaleX(${(step + 1) / total})` }}
          />
        </div>
        <span className={styles.count}>
          Step {step + 1} of {total}
        </span>
      </header>

      <div className={styles.viewport}>
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.section
            key={current.id}
            className={styles.step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className={styles.title}>{current.title}</h2>
            {current.description ? (
              <p className={styles.lead}>{current.description}</p>
            ) : null}
            <div className={styles.body}>{current.body}</div>
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className={styles.footer}>
        <Button
          variant="ghost"
          onClick={() => go(step - 1)}
          data-hidden={isFirst || undefined}
        >
          Back
        </Button>
        <div className={styles["footer-right"]}>
          {current.optional && !isLast ? (
            <Button variant="ghost" onClick={() => go(step + 1)}>
              Skip
            </Button>
          ) : null}
          {isLast ? (
            <Button variant="primary" onClick={finish}>
              Open library
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!canAdvance}
              onClick={() => go(step + 1)}
            >
              Continue
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/_standalone/welcome")({
  // Once onboarding is done, don't sit on /welcome. The library switch at
  // finish soft-reloads the window (dev) onto this route; this forwards an
  // onboarded user into the library. A fresh, not-yet-onboarded user falls
  // through and sees the wizard.
  beforeLoad: () => {
    if (window.__pondShell?.onboarded || wasOnboardedLocally()) {
      throw redirect({ to: "/" });
    }
  },
  component: Welcome,
});
