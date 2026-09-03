import { parseQueryPlan, type RawQueryPlan } from "@pond/schema/query-plan";
import { chat } from "@tanstack/ai";
import { ASSISTANT_MODELS } from "../../../shared/assistant";
import { loadAdapter } from "../agent/adapter";
import { keyFor, parseProvider } from "../agent/keys";
import { connectionFor } from "../agent/provider-models";
import { getPrefs } from "../prefs";
import { buildSystemPrompt } from "./schema-prompt";
import type { CompileContext } from "./types";

export type { CompileFacets } from "./types";

export async function compilePlan(
  input: string,
  ctx: CompileContext,
): Promise<RawQueryPlan | null> {
  const prefs = await getPrefs();
  const provider = parseProvider(prefs.agent.languageModel);
  if (!provider) return null;
  const model = ASSISTANT_MODELS.find((entry) => entry.id === provider);
  if (!model) return null;
  const apiKey = await keyFor(provider);
  if (!model.local && !apiKey) return null;
  const connection = connectionFor(provider, prefs.agent, model.model);
  const adapter = await loadAdapter({
    provider,
    model: connection.modelId,
    apiKey,
    baseUrl: connection.baseUrl,
  });
  if (!adapter) return null;
  const controller = new AbortController();
  const stream = chat({
    adapter,
    systemPrompts: [buildSystemPrompt(ctx)],
    messages: [{ role: "user", content: input }],
    abortController: controller,
  });
  let assembled = "";
  try {
    for await (const chunk of stream) {
      if (chunk.type === "TEXT_MESSAGE_CONTENT" && chunk.delta)
        assembled += chunk.delta;
    }
  } catch {
    return null;
  }
  return parseCompiledPlan(assembled);
}

function parseCompiledPlan(answer: string): RawQueryPlan | null {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return parseQueryPlan({
      filter: JSON.parse(answer.slice(start, end + 1)),
    });
  } catch {
    return null;
  }
}
