import log from "electron-log/main.js";
import { LlamaCppProvider } from "./llamacpp-provider";
import type { CompileContext } from "./types";

export type { CompileFacets } from "./types";

let bundled: LlamaCppProvider | null = null;

function getBundled(): LlamaCppProvider {
  bundled ??= new LlamaCppProvider();
  return bundled;
}

export async function compilePlan(
  input: string,
  ctx: CompileContext,
): Promise<unknown> {
  try {
    return await getBundled().compilePlan(input, ctx);
  } catch (err) {
    log.warn("[ai] compilePlan failed", err);
    return null;
  }
}
