import { parseQueryPlan, type RawQueryPlan } from "@pond/schema/query-plan";
import { generateText, Output } from "ai";
import { ASSISTANT_MODELS } from "../../../shared/assistant";
import { loadModel } from "../agent/adapter";
import { keyFor, parseProvider } from "../agent/keys";
import { connectionFor } from "../agent/provider-models";
import { getPrefs } from "../prefs";
import { queryOutputSchema } from "./query-output";
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
  const languageModel = await loadModel({
    provider,
    model: connection.modelId,
    apiKey,
    baseUrl: connection.baseUrl,
  });
  if (!languageModel) return null;
  try {
    const { output } = await generateText({
      model: languageModel,
      system: buildSystemPrompt(ctx),
      messages: [{ role: "user", content: input }],
      output: Output.object({ schema: queryOutputSchema }),
      abortSignal: AbortSignal.timeout(20_000),
    });
    if (!output) return null;
    return parseQueryPlan({ filter: output });
  } catch {
    return null;
  }
}
