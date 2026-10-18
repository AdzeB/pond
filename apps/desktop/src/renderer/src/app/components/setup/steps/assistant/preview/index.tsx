import {
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconFolderPlus,
  IconPaperclip,
  IconXmark,
} from "@pond/icons";
import { Shimmer } from "@pond/ui";
import { Calligraph } from "calligraph";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { Art } from "../../../demo";
import styles from "./styles.module.css";

const ASK = "Find my beach photos from last summer and put them in a folder";

const REPLY =
  "I found 3 beach photos from July. Review the changes before I apply them."
    .split(" ")
    .map((text, index) => ({ id: `${index}-${text}`, text }));

const STEPS = [
  {
    running: "Searching your library",
    done: "Searched your library",
    detail: "beach, last summer · 3 Saves",
  },
  {
    running: "Examining images",
    done: "Examined images",
    detail: "3 Saves",
  },
  {
    running: "Preparing changes for review",
    done: "Prepared changes",
    detail: "2 changes",
  },
] as const;

const TIMELINE = [
  { phase: "typing", ms: 1500 },
  { phase: "sent", ms: 600 },
  { phase: "step1", ms: 1200 },
  { phase: "step2", ms: 1100 },
  { phase: "step3", ms: 1200 },
  { phase: "reply", ms: 2600 },
  { phase: "applying", ms: 450 },
  { phase: "applied", ms: 2400 },
  { phase: "clearing", ms: 500 },
] as const;

type Phase = (typeof TIMELINE)[number]["phase"];

const PHASES = TIMELINE.map((entry) => entry.phase);
const REVIEW_INDEX = PHASES.indexOf("reply");

const WORD_S = 0.035;
const SPRING = { type: "spring", duration: 0.5, bounce: 0.15 } as const;
const SWAP = {
  initial: { opacity: 0, y: 4, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -4, filter: "blur(3px)" },
  transition: { duration: 0.22, ease: "easeOut" },
} as const;
const POP = {
  initial: { opacity: 0, scale: 0.4 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.4 },
  transition: { duration: 0.18 },
} as const;

/** Reduced motion holds on the review so every part of the run stays visible. */
function useTimeline(): Phase {
  const reduceMotion = useReducedMotionConfig();
  const [index, setIndex] = useState(reduceMotion ? REVIEW_INDEX : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setTimeout(
      () => setIndex((current) => (current + 1) % TIMELINE.length),
      TIMELINE[index]?.ms,
    );
    return () => clearTimeout(id);
  }, [index, reduceMotion]);
  return PHASES[index] ?? "reply";
}

function useTyped(text: string, active: boolean): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    const id = setInterval(
      () => setCount((current) => Math.min(current + 1, text.length)),
      16,
    );
    return () => clearInterval(id);
  }, [active, text]);
  return text.slice(0, count);
}

function Step({ step, done }: { step: (typeof STEPS)[number]; done: boolean }) {
  return (
    <motion.li
      className={styles.step}
      initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <span className={styles.icon}>
        <AnimatePresence mode="popLayout" initial={false}>
          {done ? (
            <motion.span key="done" className={styles.glyph} {...POP}>
              <IconCheck size={12} />
            </motion.span>
          ) : (
            <motion.span key="running" className={styles.spinner} {...POP} />
          )}
        </AnimatePresence>
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        {done ? (
          <motion.span key="done" className={styles.label} {...SWAP}>
            {step.done}
            <motion.span
              className={styles.detail}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.25 }}
            >
              {step.detail}
            </motion.span>
          </motion.span>
        ) : (
          <motion.span key="running" className={styles.label} {...SWAP}>
            <Shimmer.Root>{step.running}</Shimmer.Root>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Review({ phase }: { phase: Phase }) {
  const applied = phase === "applied" || phase === "clearing";
  const delay = REPLY.length * WORD_S + 0.1;
  return (
    <motion.div
      className={styles.review}
      data-applied={applied || undefined}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay }}
    >
      <span className={styles.heading}>
        <Calligraph>
          {applied ? "Changes Applied" : "Review Changes"}
        </Calligraph>
        <AnimatePresence mode="popLayout" initial={false}>
          {applied ? (
            <motion.span key="applied" className={styles.done} {...POP}>
              <IconCheck size={10} />
            </motion.span>
          ) : (
            <motion.span key="count" className={styles.count} {...POP}>
              2
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <motion.span
        className={styles.change}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay + 0.12, duration: 0.25 }}
      >
        <span className={styles.folder}>
          <IconFolderPlus size={12} />
        </span>
        Create folder
        <span className={styles.target}>Summer</span>
      </motion.span>
      <motion.span
        className={styles.change}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay + 0.2, duration: 0.25 }}
      >
        <span className={styles.stack}>
          <span>
            <Art kind="sunset" size="slot" />
          </span>
          <span>
            <Art kind="mountain" size="slot" />
          </span>
          <span>
            <Art kind="sunset" size="slot" />
          </span>
        </span>
        Move 3 Saves
        <span className={styles.target}>Summer</span>
      </motion.span>
      <span className={styles.actions}>
        <AnimatePresence mode="popLayout" initial={false}>
          {applied ? (
            <motion.span key="applied" className={styles.result} {...SWAP}>
              Moved 3 Saves to Summer
              <span className={styles.undo}>Undo</span>
            </motion.span>
          ) : (
            <motion.span key="pending" className={styles.buttons} {...SWAP}>
              <span className={styles.discard}>Discard</span>
              <span
                className={styles.apply}
                data-pressed={phase === "applying" || undefined}
              >
                Apply
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.div>
  );
}

export function AssistantPreview() {
  const phase = useTimeline();
  const at = PHASES.indexOf(phase);
  const typed = useTyped(ASK, phase === "typing");
  const asked = at >= PHASES.indexOf("sent");
  const replied = at >= REVIEW_INDEX;
  const working = asked && !replied;
  const started = Math.max(0, Math.min(at - 1, STEPS.length));
  const finished = replied ? STEPS.length : Math.max(0, at - 2);

  return (
    <div className={styles.preview} aria-hidden>
      <div className={styles.header}>
        Beach Photos
        <IconXmark size={12} />
      </div>
      <motion.div
        className={styles.thread}
        animate={
          phase === "clearing"
            ? { opacity: 0, y: -8, filter: "blur(2px)" }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ duration: phase === "clearing" ? 0.4 : 0 }}
      >
        {asked ? (
          <motion.span
            className={styles.ask}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING}
          >
            {ASK}
          </motion.span>
        ) : null}
        {started > 0 ? (
          <ol className={styles.steps}>
            {STEPS.slice(0, started).map((step, index) => (
              <Step key={step.done} step={step} done={index < finished} />
            ))}
          </ol>
        ) : null}
        {replied ? (
          <>
            <p className={styles.reply}>
              {REPLY.map((word, index) => (
                <motion.span
                  key={word.id}
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ delay: index * WORD_S, duration: 0.25 }}
                >
                  {`${word.text} `}
                </motion.span>
              ))}
            </p>
            <Review phase={phase} />
          </>
        ) : null}
      </motion.div>
      <div className={styles.composer}>
        {typed ? (
          <span className={styles.draft}>
            {typed}
            <span className={styles.caret} />
          </span>
        ) : (
          <span className={styles.placeholder}>Ask about your Saves</span>
        )}
        <span className={styles.toolbar}>
          <span className={styles.model}>
            Gemma 4
            <IconChevronDown size={10} />
          </span>
          <span className={styles.tools}>
            <IconPaperclip size={12} />
            <span
              className={styles.send}
              data-ready={typed.length > 0 || working || undefined}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {working ? (
                  <motion.span key="stop" className={styles.stop} {...POP} />
                ) : (
                  <motion.span key="send" className={styles.arrow} {...POP}>
                    <IconArrowUp size={10} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
