/// <reference lib="dom" />

import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";
import { bindSourceId } from "../source-id";
import { inPageRedditNormalize } from "./normalize";

export function buildExpression(postId: string): string {
  return buildItemExpression(
    inPageRedditNormalize,
    inPageRedditHarvest,
    postId,
  );
}

async function inPageRedditHarvest(
  _postId: string,
  norm: ReturnType<typeof inPageRedditNormalize>,
): Promise<unknown> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (
      document.querySelector("shreddit-post, h1") ||
      document.querySelector('meta[property="og:title"]')
    ) {
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractPostMeta();
}

export function adapt(raw: unknown, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}

export const sourceIdFromUrl = bindSourceId("reddit");
