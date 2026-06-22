import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// The agent ("Ask anything") result layer. This is intentionally separate from
// the manual filter state in `view-store`: asking produces a frozen, ranked set
// of save ids that takes over the grid, and clearing it returns to the normal
// (optionally filtered) library. No chips, no predicates surface here.

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
  | "searching"
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

interface AskState {
  readonly question: string;
  readonly status: AskStatus;
  // Ordered result ids (most relevant first). Empty until a run resolves.
  readonly ids: ReadonlyArray<string>;
  readonly count: number;
  // The compiled structured query for the last run, so "Save as view" can
  // persist a live query alongside the natural-language question.
  readonly query: Query;
  // Relaxations to offer when the run found nothing.
  readonly suggestions: ReadonlyArray<AskSuggestion>;
  // A short generated prose summary of the result set, shown in the dock card.
  readonly summary: string;
  readonly summaryStatus: AskSummaryStatus;
  // The live pipeline stage, narrated in the dock while a run is in flight.
  readonly stage: AskStage;
  // Bumps on every run so a repeated identical question still re-renders.
  readonly nonce: number;
}

const INITIAL: AskState = {
  question: "",
  status: "idle",
  ids: [],
  count: 0,
  query: EMPTY_QUERY,
  suggestions: [],
  summary: "",
  summaryStatus: "idle",
  stage: null,
  nonce: 0,
};

const store = new Store<AskState>(INITIAL);

export const askStore = store;

// Mark a run as in-flight so the grid/banner can show a thinking state.
export function startAsk(question: string): number {
  const nonce = store.state.nonce + 1;
  store.setState((s) => ({
    ...s,
    question,
    status: "thinking",
    ids: [],
    count: 0,
    suggestions: [],
    summary: "",
    summaryStatus: "idle",
    stage: "compiling",
    nonce,
  }));
  return nonce;
}

// Advance the narrated pipeline stage for a run (ignored if superseded).
export function setAskStage(nonce: number, stage: AskStage): void {
  store.setState((s) => (s.nonce !== nonce ? s : { ...s, stage }));
}

// Mark the summary request as in-flight for a run, so the card can shimmer.
export function startAskSummary(nonce: number): void {
  store.setState((s) =>
    s.nonce !== nonce
      ? s
      : { ...s, summaryStatus: "loading", stage: "summarizing" },
  );
}

// Commit a generated summary. An empty string resets to idle (the card then
// falls back to the count/question line).
export function setAskSummary(nonce: number, summary: string): void {
  store.setState((s) =>
    s.nonce !== nonce
      ? s
      : { ...s, summary, summaryStatus: summary ? "done" : "idle" },
  );
}

export function setAskSummaryError(nonce: number): void {
  store.setState((s) =>
    s.nonce !== nonce ? s : { ...s, summaryStatus: "error" },
  );
}

// Commit a resolved result set. Ignored if a newer run started meanwhile.
export function setAskResult(
  nonce: number,
  question: string,
  ids: ReadonlyArray<string>,
  query: Query = EMPTY_QUERY,
  suggestions: ReadonlyArray<AskSuggestion> = [],
): void {
  store.setState((s) =>
    s.nonce !== nonce
      ? s
      : {
          ...s,
          question,
          status: "done",
          ids,
          count: ids.length,
          query,
          suggestions,
          stage: null,
        },
  );
}

export function setAskError(nonce: number, question: string): void {
  store.setState((s) =>
    s.nonce !== nonce
      ? s
      : {
          ...s,
          question,
          status: "error",
          ids: [],
          count: 0,
          suggestions: [],
          stage: null,
        },
  );
}

export function clearAsk(): void {
  store.setState((s) => (s.status === "idle" ? s : INITIAL));
}

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
  stage: AskStage;
}

export function useAskResult(): AskResult {
  return useSelector(store, (s) => ({
    active: s.status !== "idle",
    status: s.status,
    question: s.question,
    ids: s.ids,
    count: s.count,
    query: s.query,
    suggestions: s.suggestions,
    summary: s.summary,
    summaryStatus: s.summaryStatus,
    stage: s.stage,
  }));
}

// Publish a pre-ordered result set directly (used by relaxation suggestions,
// which re-run a structured query without going back through the compiler).
export function commitAskResult(
  question: string,
  ids: ReadonlyArray<string>,
  query: Query,
): void {
  const nonce = startAsk(question);
  setAskResult(nonce, question, ids, query);
}

// Snapshot the current ask (question + compiled query) for "Save as view".
export function askSnapshot(): { question: string; query: Query } {
  return { question: store.state.question, query: store.state.query };
}

export function useAskActive(): boolean {
  return useSelector(store, (s) => s.status !== "idle");
}

export function useAskStatus(): AskStatus {
  return useSelector(store, (s) => s.status);
}
