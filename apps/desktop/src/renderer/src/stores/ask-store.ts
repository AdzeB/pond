import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

/** AI search result layer: a run freezes a ranked id set over the grid until cleared. */

type AskStatus = "idle" | "thinking" | "done" | "error";

/** The live pipeline stage, surfaced as status narration in the search bar. */
export type AskStage =
  | "compiling"
  | "planning"
  | "searching"
  | "executing"
  | "ranking"
  | null;

/** A one-tap relaxation offered when a run returns nothing: a looser query plus how many items it would surface. */
export interface AskSuggestion {
  readonly id: string;
  readonly label: string;
  readonly query: Query;
  readonly count: number;
}

interface AskState {
  readonly active: boolean;
  /** Monotonic counter so late stage/result updates ignore superseded runs. */
  readonly nonce: number;
  readonly status: AskStatus;
  readonly stage: AskStage;
  readonly question: string;
  readonly ids: ReadonlyArray<string>;
  readonly count: number;
  readonly query: Query;
  readonly suggestions: ReadonlyArray<AskSuggestion>;
}

const EMPTY_IDS: ReadonlyArray<string> = [];
const EMPTY_SUGGESTIONS: ReadonlyArray<AskSuggestion> = [];

const INITIAL: AskState = {
  active: false,
  nonce: 0,
  status: "idle",
  stage: null,
  question: "",
  ids: EMPTY_IDS,
  count: 0,
  query: EMPTY_QUERY,
  suggestions: EMPTY_SUGGESTIONS,
};

const store = new Store<AskState>(INITIAL);

/** No-op when `nonce` is no longer the live run. */
function updateIfCurrent(nonce: number, patch: Partial<AskState>): void {
  store.setState((s) => {
    if (s.nonce !== nonce || !s.active) return s;
    return { ...s, ...patch };
  });
}

/** Returns the new run's nonce so the caller can resolve exactly this run. */
export function startAskRun(question: string): number {
  const nonce = store.state.nonce + 1;
  store.setState(() => ({
    active: true,
    nonce,
    status: "thinking",
    stage: "compiling",
    question,
    ids: EMPTY_IDS,
    count: 0,
    query: EMPTY_QUERY,
    suggestions: EMPTY_SUGGESTIONS,
  }));
  return nonce;
}

export function setAskStage(nonce: number, stage: AskStage): void {
  updateIfCurrent(nonce, { stage });
}

export function setAskResult(
  nonce: number,
  question: string,
  ids: ReadonlyArray<string>,
  query: Query = EMPTY_QUERY,
  suggestions: ReadonlyArray<AskSuggestion> = [],
): void {
  updateIfCurrent(nonce, {
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
  updateIfCurrent(nonce, {
    question,
    status: "error",
    ids: EMPTY_IDS,
    count: 0,
    suggestions: EMPTY_SUGGESTIONS,
    stage: null,
  });
}

export function clearAsk(): void {
  if (!store.state.active) return;
  store.setState((s) => ({
    ...INITIAL,
    nonce: s.nonce,
  }));
}

/** Snapshot shape that `use-narrowed-saves` and the search bar consume. */
export interface AskResult {
  active: boolean;
  status: AskStatus;
  question: string;
  ids: ReadonlyArray<string>;
  count: number;
  query: Query;
  suggestions: ReadonlyArray<AskSuggestion>;
  stage: AskStage;
}

export function useAskResult(): AskResult {
  return useSelector(store, (s) => ({
    active: s.active,
    status: s.status,
    question: s.question,
    ids: s.ids,
    count: s.count,
    query: s.query,
    suggestions: s.suggestions,
    stage: s.stage,
  }));
}

/** Publishes a pre-ordered result set; relaxation suggestions re-run a structured query without the compiler. */
export function commitAskResult(
  question: string,
  ids: ReadonlyArray<string>,
  query: Query,
): void {
  const nonce = startAskRun(question);
  setAskResult(nonce, question, ids, query);
}
