import {
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconDots,
  IconHistory,
  IconLayers,
  IconPaperclip,
  IconPlus,
} from "@pond/icons";
import { useRef } from "react";
import { Cursor, glide } from "../../stage/cursor";
import { cover, sample } from "../../stage/media";
import {
  clamp,
  ease,
  envelope,
  progress,
  styled,
  WIDTH,
} from "../../stage/timeline";
import { lens, track, WHOLE } from "../camera";
import { Mac, ZOOM } from "../mac";
import { center, useBoxes } from "../measure";
import { Morph } from "../morph";
import { end, live, start } from "../timeline";
import styles from "./styles.module.css";

const WINDOW = { x: 160, y: 77 };
const QUESTION = "What did I save for the studio?";
const ANSWER =
  "Three saves fit: the Zweifel graphic design studio [1], studio organization from Minimalissimo [2], and a wicker chair by John Dickinson [3].";
const WORDS = ANSWER.split(" ");
const CITED = [
  sample("The interior of the Zweifel graphic design studio"),
  sample("Studio organization featured by Minimalissimo."),
  sample("A wicker chair designed by John Dickinson."),
];

const S = start("ask");
const TYPE = S + 500;
const STEP = 32;
const SEND = TYPE + QUESTION.length * STEP + 200;
const SEARCHED = SEND + 1150;
const STREAM = SEND + 1200;
const WORD = 40;
const CARDS = STREAM + WORDS.length * WORD + 100;
const EXIT = end("ask") - 300;

/** The Assistant: a question about your saves, answered from your library with citations. */
export function Ask({ t }: { t: number }) {
  const app = useRef<HTMLDivElement>(null);
  const send = useRef<HTMLSpanElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const boxes = useBoxes(app, { send, thread });
  const focus = {
    x: WINDOW.x + (boxes.thread.x + boxes.thread.width / 2) * ZOOM - 500,
    y: WINDOW.y + (boxes.thread.y + 150) * ZOOM - 281,
    width: 1000,
  };
  const view = track(t, [
    { at: S, ...WHOLE },
    { at: SEND + 1300, ...WHOLE, move: 1 },
    { at: SEND + 2100, ...focus, move: 800 },
  ]);
  const e = envelope(t, S, EXIT, { rise: 40, duration: 900 });
  const typed = QUESTION.slice(
    0,
    clamp(Math.floor((t - TYPE) / STEP) + 1, 0, QUESTION.length),
  );
  const sent = t >= SEND;
  const bubble = envelope(t, SEND + 120, Number.POSITIVE_INFINITY, {
    rise: 16,
    duration: 600,
  });
  const activity = envelope(t, SEND + 450, Number.POSITIVE_INFINITY, {
    rise: 8,
  });
  const shown = clamp(Math.floor((t - STREAM) / WORD) + 1, 0, WORDS.length);
  const target = center(boxes.send);
  const pointer = glide(t, [
    { at: S, x: target.x - 220, y: target.y - 120 },
    { at: SEND - 60, ...target, move: 700 },
    { at: SEND + 800, x: target.x - 90, y: target.y - 110, move: 600 },
  ]);
  const searching = t < SEARCHED;
  return (
    <div
      className={styles.stage}
      style={{
        transform: lens(view),
        visibility: live(t, "ask") ? undefined : "hidden",
      }}
    >
      <Mac.Window
        ref={app}
        place="assistant"
        className={styles.assistant}
        style={styled(e)}
      >
        <Mac.Panel>
          <div className={styles.header}>
            New Chat
            <span className={styles.icons}>
              <IconHistory size={14} />
              <IconPlus size={14} />
              <IconDots size={14} />
            </span>
          </div>
          <div ref={thread} className={styles.thread}>
            <span className={styles.question} style={styled(bubble)}>
              {QUESTION}
            </span>
            <span className={styles.activity} style={styled(activity)}>
              {searching ? (
                <Morph
                  size={12}
                  mark={0}
                  close={0}
                  turn={((t - SEND) / 700) * 360}
                />
              ) : (
                <IconCheck size={12} strokeWidth={2} />
              )}
              {searching ? "Searching your library" : "Found 3 saves"}
            </span>
            <p className={styles.answer}>
              {WORDS.map((word, i) => {
                const cite = /^\[(\d)\]([.,]?)$/.exec(word);
                const p = ease.out(progress(t, STREAM + i * WORD, 260));
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: words are static
                    key={i}
                    style={{
                      opacity: i < shown ? p : 0,
                      filter: p < 0.98 ? `blur(${(1 - p) * 3}px)` : undefined,
                    }}
                  >
                    {cite ? (
                      <>
                        <span className={styles.cite}>{cite[1]}</span>
                        {cite[2]}
                      </>
                    ) : (
                      word
                    )}{" "}
                  </span>
                );
              })}
            </p>
            <div className={styles.cited}>
              {CITED.map((entry, i) => {
                const c = envelope(
                  t,
                  CARDS + i * 120,
                  Number.POSITIVE_INFINITY,
                  { rise: 12, duration: 600 },
                );
                return (
                  <span
                    key={entry.id}
                    className={styles.save}
                    style={styled(c)}
                  >
                    <img
                      alt=""
                      src={cover(entry.id)}
                      className={styles.thumb}
                    />
                    <span className={styles.meta}>
                      <span className={styles.title}>{entry.title}</span>
                      <span className={styles.folder}>
                        <i className={styles.number}>{i + 1}</i>
                        {entry.folder}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className={styles.composer}>
            <span
              className={styles.input}
              data-empty={!typed || sent || undefined}
            >
              {sent ? "Ask about your Saves" : typed || "Ask about your Saves"}
              {typed && !sent ? <i className={styles.caret} /> : null}
            </span>
            <span className={styles.tools}>
              <IconPaperclip size={14} />
              <IconLayers size={14} />
              <span className={styles.model}>
                Llama3.2
                <IconChevronDown size={10} />
              </span>
              <span
                ref={send}
                className={styles.send}
                data-ready={(typed && !sent) || undefined}
              >
                <IconArrowUp size={14} strokeWidth={2} />
              </span>
            </span>
          </div>
        </Mac.Panel>
        <Cursor
          x={pointer.x}
          y={pointer.y}
          scale={
            (view.width / WIDTH / ZOOM) *
            (t >= SEND && t < SEND + 140 ? 0.86 : 1)
          }
          opacity={
            clamp((t - S - 900) / 250) * (1 - progress(t, SEND + 400, 300))
          }
        />
      </Mac.Window>
    </div>
  );
}
