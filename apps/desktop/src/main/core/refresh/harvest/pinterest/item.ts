/// <reference lib="dom" />

import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";
import { bindSourceId } from "../source-id";
import { inPagePinterestNormalize } from "./normalize";

export function buildExpression(pinId: string): string {
  return buildItemExpression(
    inPagePinterestNormalize,
    inPagePinterestHarvest,
    pinId,
  );
}

async function inPagePinterestHarvest(
  _pinId: string,
  norm: ReturnType<typeof inPagePinterestNormalize>,
): Promise<unknown> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (
      document.querySelector(
        '[data-test-id="pin-closeup-image"], [data-test-id="pinImg"], img[src*="pinimg.com"]',
      )
    )
      break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractPinPageMeta();
}

export function adapt(raw: unknown, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}

export const sourceIdFromUrl = bindSourceId("pinterest");
