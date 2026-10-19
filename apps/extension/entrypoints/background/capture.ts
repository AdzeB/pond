import type { CaptureWebDraft } from "@pond/schema/capture";
import type { ExtensionCookie } from "@pond/schema/session";
import { hostToSource, sourceLabel } from "@pond/schema/source-ids";
import { nativeCall } from "@/utils/native";
import {
  type CaptureOutcome,
  isSettled,
  outcomeFromResponse,
} from "@/utils/outcome";
import type { OverlayToast } from "@/utils/overlay-messaging";
import { type RecentKind, recordRecent, settleRecent } from "@/utils/recent";
import { announce, flashBadge } from "./overlay";
import { cookiesForUrl } from "./session";

const POLL_INTERVAL_MS = 750;
const POLL_ATTEMPTS = 20;

export interface CaptureRequest {
  items: CaptureWebDraft["items"];
  title: string;
  url: string;
  kind: RecentKind;
  trigger?: string;
  originUrl?: string;
  tags?: string[];
  folderIds?: string[];
  cookies?: ExtensionCookie[];
  /** The tab to confirm the save on; omit when the popup shows the result itself. */
  announceTab?: number;
}

function toastFor(
  request: CaptureRequest,
  outcome: CaptureOutcome,
): OverlayToast {
  const toast: OverlayToast = {
    id: outcome.id,
    status: outcome.status,
    title: request.title,
  };
  if (outcome.status === "failed") toast.message = outcome.message;
  if (outcome.status === "saved" || outcome.status === "duplicate") {
    toast.saveId = outcome.saveId;
  }
  return toast;
}

async function pollUntilSettled(id: string): Promise<CaptureOutcome | null> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await nativeCall({ type: "capture.status", id });
    /** Pond builds without `capture.status` answer `invalid`; the save still lands. */
    if (!response.ok) return null;
    const outcome = outcomeFromResponse(id, response);
    if (isSettled(outcome)) return outcome;
  }
  return null;
}

export async function submitCapture(
  request: CaptureRequest,
): Promise<CaptureOutcome> {
  const id = crypto.randomUUID();
  await recordRecent({
    id,
    title: request.title,
    url: request.url,
    kind: request.kind,
    status: "sending",
    at: Date.now(),
  });
  const response = await nativeCall({
    type: "capture.accept",
    draft: {
      id,
      trigger: request.trigger,
      originUrl: request.originUrl,
      metadata: {
        tags: request.tags ?? [],
        folderIds: request.folderIds ?? [],
      },
      items: request.items,
    },
    cookies: request.cookies?.length ? request.cookies : undefined,
  });
  const outcome = outcomeFromResponse(id, response);
  await settleRecent(outcome);
  if (request.announceTab !== undefined) {
    void announce(request.announceTab, toastFor(request, outcome));
  }
  if (!isSettled(outcome)) {
    void pollUntilSettled(id).then(async (polled) => {
      /** Pond accepted the save, so without a final state it is queued, not lost. */
      const settled: CaptureOutcome = polled ?? { status: "saved", id };
      await settleRecent(settled);
      if (request.announceTab !== undefined) {
        await announce(request.announceTab, toastFor(request, settled));
      }
    });
  }
  return outcome;
}

function isWebUrl(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export async function savePage(
  tab: chrome.tabs.Tab,
  options: { tags?: string[]; folderIds?: string[]; announce: boolean },
): Promise<CaptureOutcome> {
  const url = tab.url;
  if (!isWebUrl(url)) {
    return {
      status: "failed",
      id: crypto.randomUUID(),
      message: "Pond can only save web pages.",
    };
  }
  return submitCapture({
    items: [{ kind: "url", url, title: tab.title || undefined }],
    title: tab.title || url,
    url,
    kind: "page",
    trigger: "action",
    tags: options.tags,
    folderIds: options.folderIds,
    cookies: await cookiesForUrl(url),
    announceTab: options.announce ? tab.id : undefined,
  });
}

export async function saveLink(
  url: string | undefined,
  label: string | undefined,
  tabId: number | undefined,
): Promise<void> {
  if (!isWebUrl(url)) {
    flashBadge(tabId, "failed");
    return;
  }
  await submitCapture({
    items: [{ kind: "url", url }],
    title: label?.trim() || url,
    url,
    kind: "link",
    trigger: "context-menu",
    cookies: await cookiesForUrl(url),
    announceTab: tabId,
  });
}

export async function saveMedia(
  url: string | undefined,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (!isWebUrl(url)) {
    flashBadge(tab?.id, "failed");
    return;
  }
  const pageUrl = isWebUrl(tab?.url) ? tab.url : undefined;
  await submitCapture({
    items: [{ kind: "asset", url }],
    title: tab?.title || url,
    url,
    kind: "media",
    trigger: "context-menu",
    originUrl: pageUrl,
    cookies: pageUrl ? await cookiesForUrl(pageUrl) : undefined,
    announceTab: tab?.id,
  });
}

const SITE_ACTIONS = new Set(["like", "upvote", "bookmark"]);

function siteTitle(url: string, trigger: string | undefined): string {
  const source = hostToSource(url);
  const label = source ? sourceLabel(source) : new URL(url).hostname;
  const action = trigger?.split(":")[1] ?? "";
  return `${label} ${SITE_ACTIONS.has(action) ? action : "save"}`;
}

/** Saves an item a site hook saw you save, like, or bookmark. */
export async function saveFromSite(
  url: string,
  trigger: string | undefined,
  tabId: number | undefined,
): Promise<CaptureOutcome> {
  return submitCapture({
    items: [{ kind: "url", url }],
    title: siteTitle(url, trigger),
    url,
    kind: "site",
    trigger,
    announceTab: tabId,
  });
}
