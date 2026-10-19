import { CaptureWebItemSchema } from "@pond/schema/capture";
import { z } from "zod";
import type {
  CaptureRegion,
  CaptureTool,
  DragItem,
  Gesture,
  OverlayResult,
  ToolResult,
} from "@/utils/messaging";
import { getSettings } from "@/utils/settings";
import {
  isWebUrl,
  linkDraft,
  mediaDraft,
  offerDraft,
  pageDraft,
  saveDraft,
  screenshotDraft,
  submitCapture,
} from "./capture";
import { libraryTargets } from "./library";
import { announce, hideOverlay, showOverlay } from "./overlay";
import {
  captureFullPage,
  captureRegion,
  captureVisible,
  type Screenshot,
  ScreenshotError,
  type ScreenshotOptions,
} from "./screenshot";
import { cookiesForUrl } from "./session";

const BLOCKED = "Pond can't capture this page. Try a regular web page.";
const DOCK_FOLDERS = 5;

async function failOnPage(tab: chrome.tabs.Tab, message: string) {
  await announce(tab.id, {
    id: crypto.randomUUID(),
    status: "failed",
    title: tab.title || "Screenshot",
    message,
  });
}

async function screenshot(
  tab: chrome.tabs.Tab,
  take: (options: ScreenshotOptions) => Promise<Screenshot>,
) {
  try {
    const { screenshotFormat, retina } = await getSettings();
    const { dataUrl, ...size } = await take({
      format: screenshotFormat,
      retina,
    });
    await offerDraft(screenshotDraft(tab, dataUrl, size), tab.id);
  } catch (error) {
    await failOnPage(
      tab,
      error instanceof ScreenshotError ? error.message : BLOCKED,
    );
  }
}

/** Starts a capture tool; picks finish later through `overlayResult`. */
export async function runTool(
  tab: chrome.tabs.Tab,
  tool: CaptureTool,
): Promise<ToolResult> {
  if (tab.id === undefined || tab.windowId === undefined) {
    return { ok: false, message: BLOCKED };
  }
  const { id: tabId, windowId } = tab;
  if (tool === "page") {
    const draft = pageDraft(tab);
    if (!draft) return { ok: false, message: "Pond can only save web pages." };
    void offerDraft(draft, tabId);
    return { ok: true };
  }
  if (tool === "region") {
    const shown = await showOverlay(tabId, { view: "region" });
    return shown ? { ok: true } : { ok: false, message: BLOCKED };
  }
  if (tool === "images") {
    const shown = await showOverlay(tabId, {
      view: "images",
      library: await libraryTargets(),
    });
    return shown ? { ok: true } : { ok: false, message: BLOCKED };
  }
  void (async () => {
    await hideOverlay(tabId);
    await screenshot(tab, (options) =>
      tool === "full"
        ? captureFullPage(tabId, windowId, options)
        : captureVisible(tabId, windowId, options),
    );
  })();
  return { ok: true };
}

async function saveRegion(tab: chrome.tabs.Tab, region: CaptureRegion) {
  const { id: tabId, windowId } = tab;
  if (tabId === undefined || windowId === undefined) return;
  await screenshot(tab, (options) =>
    captureRegion(tabId, windowId, region, options),
  );
}

const detailsSchema = z.object({
  draft: z.object({
    kind: z.enum(["page", "link", "media", "screenshot"]),
    items: z.array(CaptureWebItemSchema).min(1).max(500),
    title: z.string().max(1000),
    url: z.string().max(10_000),
    originUrl: z.url().optional(),
    trigger: z.string().max(64).optional(),
    preview: z.null().catch(null),
  }),
  metadata: z.object({
    title: z.string().max(1000),
    notes: z.string().max(100_000),
    rating: z.number().int().min(0).max(5),
    tags: z.array(z.string().trim().min(1).max(200)).max(200),
    folderIds: z.array(z.string().min(1)).max(200),
  }),
});

function draftFromDrag(item: DragItem, tab: chrome.tabs.Tab) {
  return item.kind === "link"
    ? linkDraft(item.url, item.title, "drag")
    : mediaDraft(item.url, tab, "drag", item.title);
}

export async function handleOverlayResult(
  result: OverlayResult,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (!tab) return;
  if (result.kind === "region") {
    await saveRegion(tab, result.region);
    return;
  }
  if (result.kind === "details") {
    const parsed = detailsSchema.safeParse(result);
    if (!parsed.success) return;
    const { draft, metadata } = parsed.data;
    await saveDraft({ ...draft, preview: null }, tab.id, {
      title: metadata.title.trim() || undefined,
      notes: metadata.notes.trim() || undefined,
      rating: metadata.rating > 0 ? metadata.rating : undefined,
      tags: metadata.tags,
      folderIds: metadata.folderIds,
    });
    return;
  }
  if (result.kind === "drop") {
    const draft = draftFromDrag(result.item, tab);
    if (!draft) return;
    if (result.folderId) {
      await saveDraft(draft, tab.id, { folderIds: [result.folderId] });
      return;
    }
    await offerDraft(draft, tab.id);
    return;
  }
  const pageUrl = isWebUrl(tab.url) ? tab.url : undefined;
  const urls = result.urls.filter((url) => isWebUrl(url));
  if (urls.length === 0) return;
  await submitCapture({
    items: urls.map((url) => ({ kind: "asset", url })),
    title:
      urls.length === 1
        ? tab.title || "Image"
        : `${urls.length} images from ${tab.title || "this page"}`,
    trigger: "images",
    metadata: { tags: result.tags, folderIds: result.folderIds },
    originUrl: pageUrl,
    cookies: pageUrl ? await cookiesForUrl(pageUrl) : undefined,
    announceTab: tab.id,
  });
}

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

export async function handleGesture(
  gesture: Gesture,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (tab?.id === undefined) return;
  const settings = await getSettings();
  if (gesture.kind === "alt-click") {
    if (!settings.altClick) return;
    await offerDraft(draftFromDrag(gesture.item, tab), tab.id);
    return;
  }
  const host = hostOf(tab.url);
  if (!settings.dragToSave || (host && settings.dragBlocked.includes(host)))
    return;
  if (!isWebUrl(gesture.item.url)) return;
  const library = await libraryTargets();
  const byId = new Map(library.folders.map((folder) => [folder.id, folder]));
  const recent = library.recentFolderIds.flatMap((id) => {
    const folder = byId.get(id);
    return folder ? [folder] : [];
  });
  await showOverlay(tab.id, {
    view: "dock",
    item: gesture.item,
    folders: recent.slice(0, DOCK_FOLDERS),
  });
}
