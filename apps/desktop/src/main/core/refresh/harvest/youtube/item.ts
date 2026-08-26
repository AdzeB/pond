/// <reference lib="dom" />

import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";
import { bindSourceId } from "../source-id";
import { inPageYoutubeNormalize } from "./normalize";

export function buildExpression(videoId: string): string {
  return buildItemExpression(
    inPageYoutubeNormalize,
    inPageYoutubeHarvest,
    videoId,
  );
}

async function inPageYoutubeHarvest(
  _videoId: string,
  norm: ReturnType<typeof inPageYoutubeNormalize>,
): Promise<unknown> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (document.querySelector("#title h1, ytd-video-primary-info-renderer"))
      break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractWatchPageMeta();
}

export function adapt(raw: unknown, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}

export const sourceIdFromUrl = bindSourceId("youtube");
