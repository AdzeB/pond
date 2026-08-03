import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useBootReady } from "@/hooks/use-saves";
import {
  completeOnboarding,
  loadOnboarding,
  useOnboardingStatus,
} from "@/stores/onboarding";
import {
  ConnectSourceStep,
  CreatePondStep,
  STEPS,
  type Step,
  WelcomeStep,
} from "./steps";
import styles from "./styles.module.css";
import { Wall } from "./wall";

function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const currentIdx = STEPS.indexOf(step);

  return (
    <motion.div
      className={styles.overlay}
      role="dialog"
      aria-label="Welcome to Pond"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeOut" } }}
    >
      <div className={styles.drag} aria-hidden />
      <div className={styles["panel-left"]}>
        <span className={styles["step-counter"]}>
          {currentIdx + 1}/{STEPS.length}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {step === "welcome" ? (
            <WelcomeStep onNext={() => setStep("create-pond")} />
          ) : step === "create-pond" ? (
            <CreatePondStep onNext={() => setStep("connect-source")} />
          ) : (
            <ConnectSourceStep onDone={onDone} />
          )}
        </AnimatePresence>
      </div>
      <Wall />
    </motion.div>
  );
}

/** Shows onboarding on a fresh library; libraries that already have saves are marked onboarded silently. */
export function OnboardingGate() {
  const status = useOnboardingStatus();
  const bootReady = useBootReady();
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  useEffect(() => {
    if (show !== null) return;
    if (status === "unknown" || !bootReady) return;
    if (status === "done") {
      setShow(false);
      return;
    }
    setShow(true);
  }, [show, status, bootReady]);

  const done = () => {
    completeOnboarding();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show ? <Onboarding onDone={done} /> : null}
    </AnimatePresence>
  );
}
