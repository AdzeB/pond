import type { CaptureTool } from "@/utils/messaging";
import { saveLink, saveMedia, savePage } from "./capture";
import { runTool } from "./tools";

type MenuContexts = NonNullable<
  Parameters<typeof browser.contextMenus.create>[0]["contexts"]
>;

const PAGE_CONTEXTS: MenuContexts = [
  "page",
  "selection",
  "image",
  "link",
  "video",
  "audio",
];

const TOOL_MENUS = new Map<string, CaptureTool>([
  ["pond-visible", "visible"],
  ["pond-region", "region"],
  ["pond-element", "element"],
  ["pond-full-page", "full"],
  ["pond-assets", "images"],
]);

export function createMenus(): void {
  void browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: "pond-save",
      title: "Save Page",
      contexts: ["page", "selection"],
    });
    browser.contextMenus.create({
      id: "pond-save-link",
      title: "Save Link",
      contexts: ["link"],
    });
    browser.contextMenus.create({
      id: "pond-save-media",
      title: "Save Image",
      contexts: ["image"],
    });
    browser.contextMenus.create({
      id: "pond-save-video",
      title: "Save Video",
      contexts: ["video", "audio"],
    });
    browser.contextMenus.create({
      id: "pond-separator",
      type: "separator",
      contexts: PAGE_CONTEXTS,
    });
    for (const [id, title] of [
      ["pond-visible", "Screenshot Visible Area"],
      ["pond-region", "Screenshot Region"],
      ["pond-element", "Screenshot Element"],
      ["pond-full-page", "Screenshot Full Page"],
      ["pond-assets", "Collect Images"],
    ] as const) {
      browser.contextMenus.create({ id, title, contexts: PAGE_CONTEXTS });
    }
  });
}

export function handleMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): void {
  const id = String(info.menuItemId);
  const tool = TOOL_MENUS.get(id);
  if (tool && tab) {
    void runTool(tab, tool);
    return;
  }
  if (id === "pond-save-link") {
    void saveLink(info.linkUrl, info.selectionText, tab?.id);
    return;
  }
  if (id === "pond-save-media" || id === "pond-save-video") {
    void saveMedia(info.srcUrl, tab);
    return;
  }
  if (id === "pond-save" && tab) void savePage(tab, { announce: true });
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function handleCommand(command: string): Promise<void> {
  const tab = await activeTab();
  if (!tab) return;
  if (command === "save-page") {
    await savePage(tab, { announce: true });
    return;
  }
  if (command === "screenshot-region") await runTool(tab, "region");
}
