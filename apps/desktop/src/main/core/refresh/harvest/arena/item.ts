/// <reference lib="dom" />

import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";
import { bindSourceId } from "../source-id";
import { inPageArenaNormalize } from "./normalize";

export function buildExpression(blockId: string): string {
  return buildItemExpression(inPageArenaNormalize, inPageArenaHarvest, blockId);
}

async function inPageArenaHarvest(
  _blockId: string,
  norm: ReturnType<typeof inPageArenaNormalize>,
): Promise<unknown> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (
      document.querySelector(
        "[class*='BlockImage'], [class*='BlockText'], main img, main video",
      )
    )
      break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractBlockPageMeta();
}

export function adapt(raw: unknown, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}

export const sourceIdFromUrl = bindSourceId("arena");
