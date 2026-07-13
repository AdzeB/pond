import type { Source } from "@pond/schema/db";
import { AuthRequiredError, TerminalError, TransientError } from "../errors";

interface InWindowResult {
  ok: true;
  title?: string;
  description?: string;
  author?: string;
  lang?: string;
  mediaUrl?: string;
  mediaUrls?: Array<{ url: string; type?: string; poster?: string }>;
  mediaType?: string;
  meta?: Record<string, unknown>;
  sourceId?: string;
}

export async function fetchHtmlInWindow(
  url: string,
  source: Source,
  sourceId?: string,
): Promise<InWindowResult> {
  /** Lazy import: keeps extractors Node-importable and avoids an import cycle. */
  const { harvestUrl } = await import("../../../refresh/scrape-window");
  const result = await harvestUrl({ url, source, sourceId });
  if (result.ok) {
    return { ...result.harvest, ok: true, sourceId: result.sourceId };
  }
  switch (result.reason) {
    case "auth_required":
      throw new AuthRequiredError(`${source} session required`, source);
    case "navigate_failed":
      throw new TransientError("navigate failed");
    case "timeout":
      throw new TransientError("scrape timeout");
    default:
      throw new TerminalError("scrape returned no data");
  }
}
