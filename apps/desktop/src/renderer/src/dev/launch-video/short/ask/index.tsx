import {
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconPaperclip,
} from "@pond/icons";
import { useRef } from "react";
import { Cursor, glide } from "../../stage/cursor";
import { cover, sample } from "../../stage/media";
import {
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
  WIDTH,
} from "../../stage/timeline";
import { lens, track, WHOLE } from "../camera";
import { Mac } from "../mac";
import { center, useBoxes } from "../measure";
import { Morph } from "../morph";
import { end, live, start } from "../timeline";
import styles from "./styles.module.css";

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

/** Composer rest positions inside the panel: centered while empty, docked once a thread starts. */
const REST = { empty: 360, docked: 716 };

/** The Assistant: a question about your saves, answered from your library with citations. */
export function Ask({ t }: { t: number }) {
  const win = useRef<HTMLDivElement>(null);
  const send = useRef<HTMLSpanElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const boxes = useBoxes(win, { send, thread });
  const focus = {
    x: 160 + boxes.thread.x + boxes.thread.width / 2 - 560,
    y: 90 + boxes.thread.y + 190 - 315,
    width: 1120,
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
  const dock = ease.inOut(progress(t, SEND + 60, 650));
  const bubble = envelope(t, SEND + 200, Number.POSITIVE_INFINITY, {
    rise: 24,
    duration: 600,
  });
  const activity = envelope(t, SEND + 450, Number.POSITIVE_INFINITY, {
    rise: 12,
  });
  const shown = clamp(Math.floor((t - STREAM) / WORD) + 1, 0, WORDS.length);
  const target = center(boxes.send);
  const pointer = glide(t, [
    { at: S, x: target.x - 260, y: target.y + 170 },
    { at: SEND - 60, ...target, move: 700 },
    { at: SEND + 800, x: target.x + 120, y: target.y + 140, move: 600 },
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
      <Mac.Window ref={win} className={styles.assistant} style={styled(e)}>
        <Mac.Sidebar active="assistant" />
        <Mac.Panel>
          <span className={styles.heading}>New Chat</span>
          <span
            className={styles.empty}
            style={{ opacity: 1 - ease.out(progress(t, SEND, 250)) }}
          >
            Assistant
          </span>
          <div ref={thread} className={styles.thread}>
            <span className={styles.question} style={styled(bubble)}>
              {QUESTION}
            </span>
            <span className={styles.activity} style={styled(activity)}>
              {searching ? (
                <Morph
                  size={18}
                  mark={0}
                  close={0}
                  turn={((t - SEND) / 700) * 360}
                />
              ) : (
                <IconCheck size={16} strokeWidth={2.25} />
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
                      filter: p < 0.98 ? `blur(${(1 - p) * 4}px)` : undefined,
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
                  {
                    rise: 18,
                    duration: 600,
                  },
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
          <div
            className={styles.composer}
            style={{ top: mix(REST.empty, REST.docked, dock) }}
          >
            <span
              className={styles.input}
              data-empty={!typed || sent || undefined}
            >
              {sent ? "Ask a follow-up" : typed || "Ask about your library"}
              {typed && !sent ? <i className={styles.caret} /> : null}
            </span>
            <span className={styles.tools}>
              <IconPaperclip size={20} />
              <span className={styles.model}>
                Llama 3.2
                <IconChevronDown size={12} />
              </span>
              <span
                ref={send}
                className={styles.send}
                data-ready={(typed && !sent) || undefined}
              >
                <IconArrowUp size={20} strokeWidth={2} />
              </span>
            </span>
          </div>
        </Mac.Panel>
        <Cursor
          x={pointer.x}
          y={pointer.y}
          scale={
            (view.width / WIDTH) * (t >= SEND && t < SEND + 140 ? 0.86 : 1)
          }
          opacity={
            clamp((t - S - 900) / 250) * (1 - progress(t, SEND + 400, 300))
          }
        />
      </Mac.Window>
    </div>
  );
}
