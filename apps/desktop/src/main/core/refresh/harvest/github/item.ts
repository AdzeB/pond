/// <reference lib="dom" />

import type { JsonValue } from "@pond/schema/json";
import { captureFromPageDom, type HarvestAdaptCtx } from "../from-page";
import { buildItemExpression } from "../lib/expression";

interface GithubRepoPage {
  title: string;
  description?: string;
  author?: string;
  mediaUrls: Array<{ url: string; type: "image" }>;
  meta: { authorUrl?: string; authorAvatar?: string };
}

export function buildExpression(repoId: string): string {
  return buildItemExpression(() => ({}), inPageGithubHarvest, repoId);
}

async function inPageGithubHarvest(
  repoId: string,
): Promise<GithubRepoPage | null> {
  const deadline = Date.now() + 10_000;
  const readme = (): HTMLElement | null =>
    document.querySelector<HTMLElement>("article.markdown-body");
  while (Date.now() < deadline) {
    if (readme() || document.querySelector('meta[property="og:title"]')) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const meta = (name: string): string =>
    document
      .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      ?.getAttribute("content")
      ?.trim() ?? "";
  const about =
    document.querySelector(".BorderGrid-cell p.f4")?.textContent?.trim() ||
    meta("og:description");
  const body = readme()?.innerText?.trim() ?? "";
  const text = [about, body].filter(Boolean).join("\n\n");
  const owner = repoId.split("/")[0] ?? "";
  const page: GithubRepoPage = {
    title: repoId,
    mediaUrls: [],
    meta: { authorUrl: `https://github.com/${owner}` },
  };
  if (text) {
    page.description =
      text.length > 12_000 ? `${text.slice(0, 12_000)}…` : text;
  }
  if (owner) {
    page.author = owner;
    page.meta.authorAvatar = `https://github.com/${owner}.png`;
  }
  const image = meta("og:image");
  if (image) page.mediaUrls.push({ url: image, type: "image" });
  return page;
}

export function adapt(raw: JsonValue, ctx: HarvestAdaptCtx) {
  return captureFromPageDom(raw, ctx);
}
