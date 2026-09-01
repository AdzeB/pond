import type { RawQueryPlan } from "@pond/schema/query-plan";
import log from "electron-log/main.js";
import { LlamaCppProvider } from "./llamacpp-provider";
import type { ChatInput, CompileContext } from "./types";

export type { CompileFacets } from "./types";

let bundled: LlamaCppProvider | null = null;

function getBundled(): LlamaCppProvider {
  bundled ??= new LlamaCppProvider();
  return bundled;
}

export async function compilePlan(
  input: string,
  ctx: CompileContext,
): Promise<RawQueryPlan | null> {
  try {
    return await getBundled().compilePlan(input, ctx);
  } catch (err) {
    log.warn("[ai] compilePlan failed", err);
    return null;
  }
}

export async function completeChat(
  input: ChatInput,
  signal?: AbortSignal,
): Promise<string> {
  return getBundled().completeChat(input, signal);
}
