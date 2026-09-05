/// <reference lib="dom" />

import type { JsonValue } from "@pond/schema/json";
import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";
import { type CosmosElementPage, inPageCosmosNormalize } from "./normalize";

export function buildExpression(elementId: string): string {
  return buildItemExpression(
    inPageCosmosNormalize,
    inPageCosmosHarvest,
    elementId,
  );
}

async function inPageCosmosHarvest(
  _elementId: string,
  norm: ReturnType<typeof inPageCosmosNormalize>,
): Promise<CosmosElementPage | null> {
  const deadline = Date.now() + 12_000;
  const ready = (): boolean =>
    !!document.querySelector('meta[property="og:image"]') ||
    !!document.querySelector("main video[src], video[src]");
  while (Date.now() < deadline) {
    if (ready()) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractElementPageMeta();
}

export function adapt(raw: JsonValue, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}
