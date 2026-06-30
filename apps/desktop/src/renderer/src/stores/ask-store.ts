import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// The agent ("Ask anything") conversation layer. This is intentionally separate
// from the manual filter state in `view-store`: asking produces a frozen, ranked
// set of save ids that takes over the grid, and clearing it returns to the
// normal (optionally filtered) library. No chips, no predicates surface here.
//
// The chat is multi-turn: each exchange is an `AskTurn` appended to a transcript.
// The grid always reflects the latest turn (see `useAskResult`), while the
// composer renders the whole transcript. A follow-up can "refine in place" by
// searching within the previous turn's result set.

export type AskStatus = "idle" | "thinking" | "done" | "error";

// The optional natural-language summary of a resolved result set. It runs after
// the result publishes (best-effort, behind a reachable LLM) so the grid never
// waits on it; the dock falls back to count/question when it's empty.
export type AskSummaryStatus = "idle" | "loading" | "done" | "error";

// The live pipeline stage, surfaced as the dock's rotating status narration
// (mirrors the reference's "Reading…/Determining…/Making changes…"). Driven by
// the real run: compile the query, search/rank the library, then summarize.
export type AskStage =
  | "compiling"
  | "planning"
  | "searching"
  | "executing"
  | "ranking"
  | "summarizing"
  | null;

// A one-tap relaxation offered when a run returns nothing: a looser query plus
// how many items it would surface.
export interface AskSuggestion {
  readonly id: string;
  readonly label: string;
  readonly query: Query;
  readonly count: number;
}

// A query image attached to a turn (image-to-image visual search). `url` is an
// object URL used only for the thumbnail; it's revoked when the transcript is
// cleared so we don't leak blobs.
export interface AskQueryImage {
  readonly url: string;
  readonly name: string;
}

// An ordered piece of the user's composed message, kept so the transcript can
// render it back exactly as typed: free text interleaved with chips. The plain
// `question` (chips expanded/stripped) still drives ranking and labels.
export type AskSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "mention"; readonly id: string; readonly title: string }
  | { readonly kind: "tag"; readonly tag: string }
  | { readonly kind: "skill"; readonly name: string };

// One exchange in the conversation: the user's question (+ optional image) and
// the assistant's resolved result set. The grid reads the latest turn.
export interface AskTurn {
  readonly id: string;
  readonly nonce: number;
  // user side
  readonly question: string;
  readonly image: AskQueryImage | null;
  // The composed message as typed (text + chips, in order). Empty for turns
  // created from plain text (history replay, relaxation suggestions).
  readonly segments: ReadonlyArray<AskSegment>;
  // True when this turn searched within the previous turn's result set.
  readonly refine: boolean;
  // assistant side
  readonly status: AskStatus;
  readonly stage: AskStage;
  readonly ids: ReadonlyArray<string>;
  readonly count: number;
  readonly query: Query;
  readonly suggestions: ReadonlyArray<AskSuggestion>;
  readonly summary: string;
  readonly summaryStatus: AskSummaryStatus;
  // A direct prose answer produced by the agent (e.g. "You have 142 saves; 60%
  // from Twitter"). Distinct from `summary` (a best-effort post-hoc blurb): when
  // present it's the primary content and may stand in for an empty grid.
  readonly answer: string;
}

interface AskState {
  readonly turns: ReadonlyArray<AskTurn>;
  // Monotonic counter; each turn claims one so late summary/stage updates can
  // target their own turn even after newer turns have started.
  readonly nonce: number;
}

const INITIAL: AskState = { turns: [], nonce: 0 };

const store = new Store<AskState>(INITIAL);

export const askStore = store;

const EMPTY_IDS: ReadonlyArray<string> = [];
const EMPTY_SUGGESTIONS: ReadonlyArray<AskSuggestion> = [];
const EMPTY_SEGMENTS: ReadonlyArray<AskSegment> = [];

// Patch a single turn by nonce; a no-op if that turn is gone (transcript cleared).
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

export interface StartTurnInput {
  question: string;
  image?: AskQueryImage | null;
  segments?: ReadonlyArray<AskSegment>;
  refine?: boolean;
}

// Append a fresh in-flight turn to the transcript. Returns its nonce so the
// caller can resolve/advance exactly this turn.
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

// Back-compat: a plain text turn with no image and no refinement.
export function startAsk(question: string): number {
  return startTurn({ question });
}

// Advance the narrated pipeline stage for a turn.
export function setAskStage(nonce: number, stage: AskStage): void {
  updateTurn(nonce, { stage });
}

// Set the agent's prose answer for a turn (shown as the primary response).
export function setAskAnswer(nonce: number, answer: string): void {
  updateTurn(nonce, { answer });
}

// Mark the summary request as in-flight for a turn, so the card can shimmer.
export function startAskSummary(nonce: number): void {
  updateTurn(nonce, { summaryStatus: "loading", stage: "summarizing" });
}

// Commit a generated summary. An empty string resets to idle (the turn then
// falls back to the count/question line).
export function setAskSummary(nonce: number, summary: string): void {
  updateTurn(nonce, {
    summary,
    summaryStatus: summary ? "done" : "idle",
  });
}

export function setAskSummaryError(nonce: number): void {
  updateTurn(nonce, { summaryStatus: "error" });
}

// Commit a resolved result set for a turn.
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

// Reset the whole conversation (used on dock collapse and "New chat"). Revokes
// any attached query-image object URLs first.
export function clearAsk(): void {
  if (store.state.turns.length === 0) return;
  for (const turn of store.state.turns) {
    if (turn.image) {
      try {
        URL.revokeObjectURL(turn.image.url);
      } catch {
        /* already revoked */
      }
    }
  }
  store.setState((s) => ({ turns: [], nonce: s.nonce }));
}

// The latest turn drives the grid; this is the back-compat snapshot shape that
// `use-narrowed-saves` and the toolbar consume.
export interface AskResult {
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

// The full transcript, for the composer's chat view.
export function useAskTurns(): ReadonlyArray<AskTurn> {
  return useSelector(store, (s) => s.turns);
}

// Publish a pre-ordered result set directly as a new turn (used by relaxation
// suggestions, which re-run a structured query without going through the
// compiler).
export function commitAskResult(
  question: string,
  ids: ReadonlyArray<string>,
  query: Query,
): void {
  const nonce = startTurn({ question });
  setAskResult(nonce, question, ids, query);
}

// Snapshot the latest ask (question + compiled query) for "Save as view".
export function askSnapshot(): { question: string; query: Query } {
  const last = store.state.turns[store.state.turns.length - 1];
  return {
    question: last?.question ?? "",
    query: last?.query ?? EMPTY_QUERY,
  };
}

export function useAskActive(): boolean {
  return useSelector(store, (s) => s.turns.length > 0);
}

export function useAskStatus(): AskStatus {
  return useSelector(
    store,
    (s) => s.turns[s.turns.length - 1]?.status ?? "idle",
  );
}
