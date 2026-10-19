import { parseCaptureTags } from "@pond/schema/capture";
import type {
  CaptureRegion,
  CaptureTool,
  OverlayResult,
  ToolResult,
} from "@/utils/messaging";
import { submitCapture } from "./capture";
import { listFolders } from "./library";
import { announce, hideOverlay, showOverlay } from "./overlay";
import {
  captureFullPage,
  captureVisible,
  cropScreenshot,
  ScreenshotError,
} from "./screenshot";
import { cookiesForUrl } from "./session";

const BLOCKED = "Pond can't capture this page. Try a regular web page.";

async function saveScreenshot(
  tab: chrome.tabs.Tab,
  dataUrl: string,
): Promise<void> {
  const title = tab.title || "Page screenshot";
  await submitCapture({
    items: [{ kind: "image", dataUrl, title }],
    title,
    url: tab.url ?? "",
    kind: "screenshot",
    tags: ["screenshot"],
    originUrl: tab.url && /^https?:/i.test(tab.url) ? tab.url : undefined,
    announceTab: tab.id,
  });
}

async function failOnPage(tab: chrome.tabs.Tab, message: string) {
  await announce(tab.id, {
    id: crypto.randomUUID(),
    status: "failed",
    title: tab.title || "Screenshot",
    message,
  });
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
  if (tool === "region" || tool === "element") {
    const shown = await showOverlay(tabId, { view: tool });
    return shown ? { ok: true } : { ok: false, message: BLOCKED };
  }
  if (tool === "images") {
    const shown = await showOverlay(tabId, {
      view: "images",
      folders: await listFolders(),
    });
    return shown ? { ok: true } : { ok: false, message: BLOCKED };
  }
  void (async () => {
    try {
      await hideOverlay(tabId);
      const dataUrl =
        tool === "full"
          ? await captureFullPage(tabId, windowId)
          : await captureVisible(tabId, windowId);
      await saveScreenshot(tab, dataUrl);
    } catch (error) {
      await failOnPage(
        tab,
        error instanceof ScreenshotError ? error.message : BLOCKED,
      );
    }
  })();
  return { ok: true };
}

async function captureRegion(tab: chrome.tabs.Tab, region: CaptureRegion) {
  if (tab.id === undefined || tab.windowId === undefined) return;
  try {
    /** Gives the overlay a frame to unmount so it isn't in the screenshot. */
    await new Promise((resolve) => setTimeout(resolve, 120));
    const visible = await captureVisible(tab.id, tab.windowId);
    await saveScreenshot(tab, await cropScreenshot(visible, region));
  } catch (error) {
    await failOnPage(
      tab,
      error instanceof ScreenshotError ? error.message : BLOCKED,
    );
  }
}

export async function handleOverlayResult(
  result: OverlayResult,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (!tab) return;
  if (result.kind === "region") {
    await captureRegion(tab, result.region);
    return;
  }
  const pageUrl = tab.url && /^https?:/i.test(tab.url) ? tab.url : undefined;
  const urls = result.urls.filter((url) => /^https?:\/\//i.test(url));
  if (urls.length === 0) return;
  await submitCapture({
    items: urls.map((url) => ({ kind: "asset", url })),
    title:
      urls.length === 1
        ? tab.title || "Image"
        : `${urls.length} images from ${tab.title || "this page"}`,
    url: pageUrl ?? urls[0] ?? "",
    kind: "images",
    tags: parseCaptureTags(result.tagText),
    folderIds: result.folderIds,
    originUrl: pageUrl,
    cookies: pageUrl ? await cookiesForUrl(pageUrl) : undefined,
    announceTab: tab.id,
  });
}
