import { BEATS, closes, HERO, type ProductBeat } from "./timeline";
import { type Effect, Verb } from "./verb";

interface Headline {
  verb: string;
  sub: string;
  fx: Effect;
  exit?: number;
  y?: number;
}

const HEADLINES = {
  save: {
    verb: "Save it.",
    sub: "Like or bookmark as usual. Pond keeps a copy.",
    fx: "drop",
  },
  sync: {
    verb: "Sync it.",
    sub: "Connect once, and Pond saves in the background.",
    fx: "flip",
    exit: BEATS.sync[0] + 2430,
    y: 540,
  },
  own: {
    verb: "Own it.",
    sub: "Everything stays in a folder on your Mac.",
    fx: "drop",
  },
  enrich: {
    verb: "Enrich it.",
    sub: "Captions, text, and colors, on-device.",
    fx: "scramble",
  },
  find: {
    verb: "Find it.",
    sub: "Plain-language search, precise filters.",
    fx: "type",
  },
  ask: {
    verb: "Ask it.",
    sub: "With your key or a local model.",
    fx: "smear",
  },
  connect: {
    verb: "Connect it.",
    sub: "Cursor and Claude, over MCP.",
    fx: "flip",
  },
} satisfies Record<ProductBeat, Headline>;

/** The verb line over each product beat. */
export function Headlines({ t }: { t: number }) {
  /** SAFETY: `HEADLINES` satisfies a record over exactly the product beats. */
  return (Object.keys(HEADLINES) as ProductBeat[]).map((beat) => {
    const line: Headline = HEADLINES[beat];
    return (
      <Verb
        key={beat}
        t={t}
        verb={line.verb}
        sub={line.sub}
        fx={line.fx}
        enter={BEATS[beat][0]}
        exit={line.exit ?? closes(beat)}
        hero={HERO.get(beat)}
        y={line.y}
      />
    );
  });
}
