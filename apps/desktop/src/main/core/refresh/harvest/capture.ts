import type { Source } from "@pond/schema/db";
import type { Capture } from "@pond/schema/raw";
import type { ReportDownloadActivity } from "@shared/download-activity";
import {
  AuthRequiredError,
  TerminalError,
  TransientError,
} from "../../pipeline/extractors/errors";
import { harvestUrl } from "../harvest-window/harvest";

interface CaptureArgs {
  url: string;
  source: Source;
  sourceId?: string;
  accountId?: string | null;
  reportActivity?: ReportDownloadActivity;
}

export async function captureFromSource(args: CaptureArgs): Promise<Capture> {
  if (args.source === "web" || args.source === "local") {
    throw new TerminalError(
      `${args.source} does not harvest via captureFromSource`,
    );
  }

  if (args.source === "pinterest" && args.sourceId) {
    const { fetchPinterestCapture } = await import("./pinterest/api");
    const result = await fetchPinterestCapture({ sourceId: args.sourceId });
    if (result.ok) return result.capture;
  }

  if (args.source === "arena" && args.sourceId) {
    const { fetchArenaCapture } = await import("./arena/api");
    const result = await fetchArenaCapture({ sourceId: args.sourceId });
    if (result.ok) return result.capture;
  }

  const result = await harvestUrl(args);
  if (result.ok && result.capture) return result.capture;
  switch (result.reason) {
    case "auth_required":
      throw new AuthRequiredError(
        `${args.source} session required`,
        args.source,
      );
    case "navigate_failed":
      throw new TransientError("navigate failed");
    case "timeout":
      throw new TransientError("scrape timeout");
    default:
      throw new TerminalError("scrape returned no data");
  }
}
