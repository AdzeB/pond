import {
  type AgentStepRecord,
  parseAgentAction,
  type QueryPlan,
} from "@pond/schema";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import type { Save } from "@/lib/types";
import { validatePlan } from "./nl-validate";
import { executePlan, type PlanResult } from "./plan-exec";

/**
 * Renderer-side agentic loop: asks main (ai.agentStep) for one action at a time, executes it over the candidate pool, feeds an observation back, and repeats until a `final` plan or an `answer`.
 * @remarks Every plan passes validatePlan and the executor only runs typed steps, so a model can never run arbitrary code.
 */

type AgentStage = "planning" | "executing";

interface AgentRunInput {
  question: string;
  pool: ReadonlyArray<Save>;
  /** Grounding digest (capFacets output) sent to the model each round. */
  facets: unknown;
  maxSteps: number;
  /** Embeds the question for semantic ranking; returns null when unavailable. */
  embed: (text: string) => Promise<Float32Array | null>;
  /** Narrates progress to the dock. */
  onStage: (stage: AgentStage) => void;
}

interface AgentOutcome {
  /** Result ids to show in the grid; may be evidence for an answer turn. */
  ids: string[];
  /** The committed filter, for suggestions/relaxations. */
  query: Query;
  /** Non-empty for an answer turn (prose result, no grid needed). */
  answer: string;
}

const SAMPLE_SIZE = 5;
const TOP_FACETS = 6;

function applyLimit(ids: string[], limit: number | undefined): string[] {
  return limit != null && limit > 0 ? ids.slice(0, limit) : ids;
}

function topValues(
  pool: ReadonlyArray<Save>,
  field: "source" | "type" | "tags" | "creator",
): string {
  const counts = new Map<string, number>();
  for (const save of pool) {
    const projected = FIELD_DESCRIPTORS[field].project(save);
    const values = Array.isArray(projected)
      ? projected.map((v) => String(v))
      : projected == null || String(projected) === ""
        ? []
        : [String(projected)];
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_FACETS)
    .map(([v, n]) => `${v} (${n})`);
  return top.length > 0 ? top.join(", ") : "(none)";
}

/** Library digest for an `inspect` action. */
function describeLibrary(pool: ReadonlyArray<Save>): string {
  return [
    `Total items: ${pool.length}.`,
    `Top sources: ${topValues(pool, "source")}.`,
    `Top types: ${topValues(pool, "type")}.`,
    `Top creators: ${topValues(pool, "creator")}.`,
    `Top tags: ${topValues(pool, "tags")}.`,
  ].join(" ");
}

/** Includes a small title sample so the model can sanity-check relevance before committing. */
function describeResult(result: PlanResult, pool: ReadonlyArray<Save>): string {
  const byId = new Map(pool.map((s) => [s.id, s]));
  const total = result.facts?.total ?? result.ids.length;
  const parts = [`Matched ${total} items.`];
  if (result.facts?.groups && result.facts.groups.length > 0) {
    const groups = result.facts.groups
      .slice(0, TOP_FACETS)
      .map((g) => `${g.label}: ${g.count}`)
      .join(", ");
    parts.push(`Counts: ${groups}.`);
  }
  const sample = result.ids
    .slice(0, SAMPLE_SIZE)
    .map((id) => byId.get(id)?.title ?? "Untitled")
    .map((t) => `"${t}"`);
  if (sample.length > 0) parts.push(`Sample: ${sample.join(", ")}.`);
  return parts.join(" ");
}

export async function runAgent(input: AgentRunInput): Promise<AgentOutcome> {
  const { question, pool, facets, maxSteps, embed, onStage } = input;
  const rankVector = await embed(question);
  const run = (plan: QueryPlan): Promise<PlanResult> =>
    executePlan(plan, { pool, rankVector, residualText: "", question });

  const steps: AgentStepRecord[] = [];
  let lastPlan: QueryPlan | null = null;

  for (let i = 0; i < maxSteps; i += 1) {
    onStage("planning");
    let raw: unknown;
    try {
      const res = (await window.pond.query("ai.agentStep", {
        question,
        facets,
        steps,
      })) as { action: unknown };
      raw = res.action;
    } catch {
      break;
    }
    const action = parseAgentAction(raw);
    if (!action) break;

    if (action.type === "inspect") {
      steps.push({ action, observation: describeLibrary(pool) });
      continue;
    }

    if (action.type === "run_plan") {
      onStage("executing");
      const plan = validatePlan(action.plan);
      lastPlan = plan;
      const result = await run(plan);
      steps.push({ action, observation: describeResult(result, pool) });
      continue;
    }

    if (action.type === "final") {
      onStage("executing");
      const plan = validatePlan(action.plan);
      const result = await run(plan);
      return {
        ids: applyLimit(result.ids, plan.limit),
        query: plan.filter,
        answer: "",
      };
    }

    /** An "answer" action is prose; back it with the last plan's set as supporting evidence in the grid. */
    const evidence = lastPlan ? await run(lastPlan) : null;
    return {
      ids: evidence ? applyLimit(evidence.ids, lastPlan?.limit) : [],
      query: lastPlan?.filter ?? EMPTY_QUERY,
      answer: action.text,
    };
  }

  /** Steps exhausted or the model gave up: commit the best plan that ran, if any. */
  if (lastPlan) {
    const result = await run(lastPlan);
    return {
      ids: applyLimit(result.ids, lastPlan.limit),
      query: lastPlan.filter,
      answer: "",
    };
  }
  return { ids: [], query: EMPTY_QUERY, answer: "" };
}
