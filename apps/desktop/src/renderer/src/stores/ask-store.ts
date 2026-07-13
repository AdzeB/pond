import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

/**
 * The "Ask anything" conversation layer, intentionally separate from the manual filter state in `view-store`: asking produces a frozen ranked id set that takes over the grid, and clearing it returns to the normal library.
 * @remarks Multi-turn: each exchange is an `AskTurn` on a transcript; the grid reflects the latest turn while the composer renders them all, and a follow-up can refine within the previous turn's result set.
 */

type AskStatus = "idle" | "thinking" | "done" | "error";

/** The summary runs after the result publishes so the grid never waits on it; the dock falls back to count/question when empty. */
type AskSummaryStatus = "idle" | "loading" | "done" | "error";

/** The live pipeline stage, surfaced as the dock's rotating status narration. */
export type AskStage =
  | "compiling"
  | "planning"
  | "searching"
  | "executing"
  | "ranking"
  | "summarizing"
  | null;

/** A one-tap relaxation offered when a run returns nothing: a looser query plus how many items it would surface. */
export interface AskSuggestion {
  readonly id: string;
  readonly label: string;
  readonly query: Query;
  readonly count: number;
}

/** A query image attached to a turn; `url` is a thumbnail-only object URL, revoked when the transcript is cleared so blobs don't leak. */
export interface AskQueryImage {
  readonly url: string;
  readonly name: string;
}

/** An ordered piece of the composed message so the transcript renders it back exactly as typed; the plain `question` still drives ranking and labels. */
export type AskSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "mention"; readonly id: string; readonly title: string }
  | { readonly kind: "tag"; readonly tag: string }
  | { readonly kind: "skill"; readonly name: string };

/** One exchange in the conversation; the grid reads the latest turn. */
export interface AskTurn {
  readonly id: string;
  readonly nonce: number;
  readonly question: string;
  readonly image: AskQueryImage | null;
  /** The composed message as typed; empty for turns created from plain text (history replay, relaxation suggestions). */
  readonly segments: ReadonlyArray<AskSegment>;
  /** True when this turn searched within the previous turn's result set. */
  readonly refine: boolean;
  readonly status: AskStatus;
  readonly stage: AskStage;
  readonly ids: ReadonlyArray<string>;
  readonly count: number;
  readonly query: Query;
  readonly suggestions: ReadonlyArray<AskSuggestion>;
  readonly summary: string;
  readonly summaryStatus: AskSummaryStatus;
  /** A direct prose answer from the agent, distinct from `summary`: when present it's the primary content and may stand in for an empty grid. */
  readonly answer: string;
}

interface AskState {
  readonly turns: ReadonlyArray<AskTurn>;
  /** Monotonic counter; each turn claims one so late summary/stage updates can target their own turn even after newer turns started. */
  readonly nonce: number;
}

const INITIAL: AskState = { turns: [], nonce: 0 };

const store = new Store<AskState>(INITIAL);

export const askStore = store;

const EMPTY_IDS: ReadonlyArray<string> = [];
const EMPTY_SUGGESTIONS: ReadonlyArray<AskSuggestion> = [];
const EMPTY_SEGMENTS: ReadonlyArray<AskSegment> = [];

/** No-op if the turn is gone (transcript cleared). */
function updateTurn(nonce: number, patch: Partial<AskTurn>): void {
  store.setState((s) => {
    let changed = false;
    const turns = s.turns.map((t) => {
      if (t.nonce !== nonce) return t;
      changed = true;
      return { ...t, ...patch };
    });
    return changed ? { ...s, turns } : s;
  });
}

interface StartTurnInput {
  question: string;
  image?: AskQueryImage | null;
  segments?: ReadonlyArray<AskSegment>;
  refine?: boolean;
}

/** Returns the new turn's nonce so the caller can resolve/advance exactly this turn. */
export function startTurn(input: StartTurnInput): number {
  const nonce = store.state.nonce + 1;
  const turn: AskTurn = {
    id: `turn-${nonce}`,
    nonce,
    question: input.question,
    image: input.image ?? null,
    segments: input.segments ?? EMPTY_SEGMENTS,
    refine: input.refine ?? false,
    status: "thinking",
    stage: "compiling",
    ids: EMPTY_IDS,
    count: 0,
    query: EMPTY_QUERY,
    suggestions: EMPTY_SUGGESTIONS,
    summary: "",
    summaryStatus: "idle",
    answer: "",
  };
  store.setState((s) => ({ turns: [...s.turns, turn], nonce }));
  return nonce;
}

export function setAskStage(nonce: number, stage: AskStage): void {
  updateTurn(nonce, { stage });
}

export function setAskAnswer(nonce: number, answer: string): void {
  updateTurn(nonce, { answer });
}

/** Marks the summary request in-flight so the card can shimmer. */
export function startAskSummary(nonce: number): void {
  updateTurn(nonce, { summaryStatus: "loading", stage: "summarizing" });
}

/** An empty string resets to idle, so the turn falls back to the count/question line. */
export function setAskSummary(nonce: number, summary: string): void {
  updateTurn(nonce, {
    summary,
    summaryStatus: summary ? "done" : "idle",
  });
}

export function setAskSummaryError(nonce: number): void {
  updateTurn(nonce, { summaryStatus: "error" });
}

export function setAskResult(
  nonce: number,
  question: string,
  ids: ReadonlyArray<string>,
  query: Query = EMPTY_QUERY,
  suggestions: ReadonlyArray<AskSuggestion> = [],
): void {
  updateTurn(nonce, {
    question,
    status: "done",
    ids,
    count: ids.length,
    query,
    suggestions,
    stage: null,
  });
}

export function setAskError(nonce: number, question: string): void {
  updateTurn(nonce, {
    question,
    status: "error",
    ids: EMPTY_IDS,
    count: 0,
    suggestions: EMPTY_SUGGESTIONS,
    stage: null,
  });
}

/** Revokes any attached query-image object URLs before dropping the transcript. */
export function clearAsk(): void {
  if (store.state.turns.length === 0) return;
  for (const turn of store.state.turns) {
    if (turn.image) {
      try {
        URL.revokeObjectURL(turn.image.url);
      } catch {
        /** Already revoked. */
      }
    }
  }
  store.setState((s) => ({ turns: [], nonce: s.nonce }));
}

/** The latest-turn snapshot shape that `use-narrowed-saves` and the toolbar consume. */
interface AskResult {
  active: boolean;
  status: AskStatus;
  question: string;
  ids: ReadonlyArray<string>;
  count: number;
  query: Query;
  suggestions: ReadonlyArray<AskSuggestion>;
  summary: string;
  summaryStatus: AskSummaryStatus;
  answer: string;
  stage: AskStage;
}

export function useAskResult(): AskResult {
  return useSelector(store, (s) => {
    const last = s.turns[s.turns.length - 1];
    return {
      active: s.turns.length > 0,
      status: last?.status ?? "idle",
      question: last?.question ?? "",
      ids: last?.ids ?? EMPTY_IDS,
      count: last?.count ?? 0,
      query: last?.query ?? EMPTY_QUERY,
      suggestions: last?.suggestions ?? EMPTY_SUGGESTIONS,
      summary: last?.summary ?? "",
      summaryStatus: last?.summaryStatus ?? "idle",
      answer: last?.answer ?? "",
      stage: last?.stage ?? null,
    };
  });
}

export function useAskTurns(): ReadonlyArray<AskTurn> {
  return useSelector(store, (s) => s.turns);
}

/** Publishes a pre-ordered result set directly as a new turn; relaxation suggestions re-run a structured query without going through the compiler. */
export function commitAskResult(
  question: string,
  ids: ReadonlyArray<string>,
  query: Query,
): void {
  const nonce = startTurn({ question });
  setAskResult(nonce, question, ids, query);
}

/** Snapshot of the latest ask for "Save as view". */
export function askSnapshot(): { question: string; query: Query } {
  const last = store.state.turns[store.state.turns.length - 1];
  return {
    question: last?.question ?? "",
    query: last?.query ?? EMPTY_QUERY,
  };
}
