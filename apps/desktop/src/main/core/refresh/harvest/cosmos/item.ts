/// <reference lib="dom" />

import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";
import { bindSourceId } from "../source-id";
import { inPageCosmosNormalize } from "./normalize";

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
): Promise<unknown> {
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

export function adapt(raw: unknown, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}

export const sourceIdFromUrl = bindSourceId("cosmos");
