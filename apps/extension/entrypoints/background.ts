import type { Source } from "@pond/schema/db";
import type {
  ExtensionCookie,
  SessionImportResponse,
} from "@pond/schema/session";
import { onMessage } from "@/utils/messaging";
import { nativeCall } from "@/utils/native";
import { probe } from "@/utils/probe";
import { ensureSettings } from "@/utils/settings";
import type { PushSessionResult } from "@/utils/types";
import { cookieDomainForSource, hostToSource } from "@/utils/url";

const AUTO_PUSH_COOLDOWN_MS = 60_000;
const SAVE_MENU_ID = "pond-save";

export default defineBackground(() => {
  const recentAutoPush = new Map<Source, number>();
  let autoPushInFlight = false;

  chrome.runtime.onInstalled.addListener(async () => {
    await ensureSettings();
    clearStaleBadge();
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: SAVE_MENU_ID,
        title: "Save to Pond",
        contexts: ["page", "link", "image", "video", "audio"],
      });
    });
  });

  chrome.runtime.onStartup.addListener(clearStaleBadge);

  clearStaleBadge();

  function clearStaleBadge(): void {
    if (!chrome.action) return;
    chrome.action.setBadgeText({ text: "" }).catch(() => {});
  }

  if (chrome.action?.onClicked) {
    chrome.action.onClicked.addListener((tab) => {
      const url = tab.url;
      if (!url) {
        flashBadge(tab.id, "!", "#dd9b00");
        return;
      }
      void handleCapture({ url, trigger: "action" }, tab.id);
    });
  }

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== SAVE_MENU_ID) return;
    const url = info.linkUrl || info.srcUrl || info.pageUrl || tab?.url;
    if (!url) {
      flashBadge(tab?.id, "!", "#dd9b00");
      return;
    }
    void handleCapture({ url, trigger: "context-menu" }, tab?.id);
  });

  onMessage("log", ({ data }) => {
    const fn =
      data.level === "error"
        ? console.error
        : data.level === "warn"
          ? console.warn
          : console.info;
    fn("[pond]", data.message, data.data);
  });

  onMessage("capture", ({ data, sender }) =>
    handleCapture(data, sender.tab?.id).catch((err) => {
      console.error("[pond] capture failed", err);
      return false;
    }),
  );

  onMessage("openPond", ({ data }) => openPondTab(data));

  onMessage("pushSession", ({ data }) =>
    pushSession(data).catch((err) => {
      console.error("[pond] pushSession threw", err);
      return {
        ok: false,
        reason: "network",
        detail: String(err),
      } satisfies PushSessionResult;
    }),
  );

  onMessage("probe", async () => {
    try {
      return await probe();
    } catch (err) {
      console.warn("[pond] probe failed", err);
      return { state: "offline" as const };
    }
  });

  chrome.tabs.onActivated.addListener(() => {
    void maybeAutoPush();
  });

  chrome.tabs.onUpdated.addListener((_tabId, info) => {
    if (info.status === "complete" || info.url) void maybeAutoPush();
  });

  chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.removed) return;
    void maybeAutoPush();
  });

  async function openPondTab(path: string | undefined): Promise<boolean> {
    const target = path ? `pond://${path}` : "pond://";
    try {
      await chrome.tabs.create({ url: target, active: true });
      return true;
    } catch (err) {
      console.error("[pond] openPond failed", err);
      return false;
    }
  }

  async function fetchPendingSource(): Promise<Source | null> {
    const result = await nativeCall({ type: "session.pending" });
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return null;
    }
    const source = (result.data as { source?: Source }).source;
    return source ?? null;
  }

  async function maybeAutoPush(): Promise<void> {
    if (autoPushInFlight) return;
    autoPushInFlight = true;
    try {
      const pending = await fetchPendingSource();
      if (!pending || !cookieDomainForSource(pending)) return;

      const last = recentAutoPush.get(pending);
      if (last && Date.now() - last < AUTO_PUSH_COOLDOWN_MS) return;

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url) return;
      const tabSource = hostToSource(tab.url);
      if (tabSource !== pending) {
        return;
      }

      recentAutoPush.set(pending, Date.now());
      const result = await pushSession(pending);
      if (result.ok && result.data.connected) {
        flashBadge(tab.id, "ok", "#1f9d55");
        return;
      }
      recentAutoPush.delete(pending);
      if (result.ok) return;
      if (result.reason === "network") {
        console.warn("[pond] auto-push failed", result.detail);
      }
    } finally {
      autoPushInFlight = false;
    }
  }

  async function pushSession(source: Source): Promise<PushSessionResult> {
    const domain = cookieDomainForSource(source);
    if (!domain) {
      return { ok: false, reason: "no_cookies", detail: "source is public" };
    }

    let raw: chrome.cookies.Cookie[];
    try {
      raw = await chrome.cookies.getAll({ domain });
    } catch (err) {
      return {
        ok: false,
        reason: "no_cookies",
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    if (raw.length === 0) {
      return { ok: false, reason: "no_cookies" };
    }

    const cookies: ExtensionCookie[] = raw.map(cookieFromChrome);
    const result = await nativeCall({
      type: "session.import",
      source,
      cookies,
    });
    if (!result.ok) {
      return { ok: false, reason: "network", detail: result.error };
    }
    const data = result.data as SessionImportResponse | undefined;
    if (!data) {
      return { ok: false, reason: "network", detail: "bad response shape" };
    }
    return { ok: true, data };
  }

  function cookieFromChrome(c: chrome.cookies.Cookie): ExtensionCookie {
    return {
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: normaliseSameSite(c.sameSite),
      expirationDate:
        typeof c.expirationDate === "number" ? c.expirationDate : null,
      hostOnly: c.hostOnly,
    };
  }

  function normaliseSameSite(s: unknown): ExtensionCookie["sameSite"] {
    if (s === "no_restriction" || s === "lax" || s === "strict") return s;
    return "unspecified";
  }

  /** Live-tab cookies for explicit saves; archive_page writes them into a throwaway partition then drops them. */
  async function cookiesForUrl(url: string): Promise<ExtensionCookie[]> {
    try {
      const page = new URL(url);
      if (page.protocol !== "http:" && page.protocol !== "https:") return [];
      const [byUrl, byDomain] = await Promise.all([
        chrome.cookies.getAll({ url }),
        chrome.cookies.getAll({ domain: page.hostname }),
      ]);
      const seen = new Set<string>();
      const out: ExtensionCookie[] = [];
      for (const c of [...byUrl, ...byDomain]) {
        const key = `${c.name}\0${c.domain}\0${c.path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cookieFromChrome(c));
        if (out.length >= 500) break;
      }
      return out;
    } catch (err) {
      console.warn("[pond] cookiesForUrl failed", err);
      return [];
    }
  }

  function wantsPageCookies(trigger: string | undefined): boolean {
    return (
      trigger === "action" ||
      trigger === "context-menu" ||
      trigger === "toolbar"
    );
  }

  async function handleCapture(
    payload: { url: string; trigger?: string },
    tabId?: number,
  ): Promise<boolean> {
    if (!payload || typeof payload.url !== "string") return false;

    const cookies = wantsPageCookies(payload.trigger)
      ? await cookiesForUrl(payload.url)
      : [];

    const result = await nativeCall({
      type: "enqueue",
      url: payload.url,
      ...(payload.trigger ? { trigger: payload.trigger } : {}),
      ...(cookies.length > 0 ? { cookies } : {}),
    });

    if (!result.ok) {
      console.warn("[pond] enqueue rejected", result.error);
      flashBadge(tabId, "x", "#cc3333");
      return false;
    }
    flashBadge(tabId, "ok", "#1f9d55");
    return true;
  }

  function flashBadge(tabId: number | undefined, text: string, color: string) {
    if (!chrome.action) return;
    const opts: { text: string; tabId?: number } = { text };
    const colorOpts: { color: string; tabId?: number } = { color };
    if (typeof tabId === "number") {
      opts.tabId = tabId;
      colorOpts.tabId = tabId;
    }
    chrome.action.setBadgeBackgroundColor(colorOpts);
    chrome.action.setBadgeText(opts);
    setTimeout(() => {
      const clear: { text: string; tabId?: number } = { text: "" };
      if (typeof tabId === "number") clear.tabId = tabId;
      chrome.action.setBadgeText(clear);
    }, 1500);
  }
});
