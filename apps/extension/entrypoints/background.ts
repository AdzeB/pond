import { SOURCES, type Source } from "@pond/schema/db";
import type { EnqueueRequest } from "@pond/schema/ingest";
import {
  type ExtensionCookie,
  sessionImportResponseSchema,
} from "@pond/schema/session";
import { z } from "zod";
import { onMessage } from "@/utils/messaging";
import { nativeCall } from "@/utils/native";
import { probe } from "@/utils/probe";
import { ensureSettings } from "@/utils/settings";
import type { PondCapturePayload, PushSessionResult } from "@/utils/types";
import { cookieDomainForSource, hostToSource } from "@/utils/url";

const AUTO_PUSH_COOLDOWN_MS = 60_000;
const SAVE_MENU_ID = "pond-save";

const capturePayloadSchema = z.object({
  url: z.string(),
  trigger: z.string().optional(),
});

const pendingSessionSchema = z.object({ source: z.enum(SOURCES) });

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

  onMessage("capture", ({ data, sender }) => {
    const payload = capturePayloadSchema.safeParse(data);
    if (!payload.success) return false;
    return handleCapture(payload.data, sender.tab?.id).catch((err) => {
      console.error("[pond] capture failed", err);
      return false;
    });
  });

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
    if (!result.ok) return null;
    const pending = pendingSessionSchema.safeParse(result.data);
    return pending.success ? pending.data.source : null;
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
    const imported = sessionImportResponseSchema.safeParse(result.data);
    if (!imported.success) {
      return { ok: false, reason: "network", detail: "bad response shape" };
    }
    return { ok: true, data: imported.data };
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
      expirationDate: c.expirationDate ?? null,
      hostOnly: c.hostOnly,
    };
  }

  function normaliseSameSite(
    s: chrome.cookies.Cookie["sameSite"],
  ): ExtensionCookie["sameSite"] {
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
    payload: PondCapturePayload,
    tabId?: number,
  ): Promise<boolean> {
    const cookies = wantsPageCookies(payload.trigger)
      ? await cookiesForUrl(payload.url)
      : [];

    const request: EnqueueRequest & { type: "enqueue" } = {
      type: "enqueue",
      url: payload.url,
    };
    if (payload.trigger) request.trigger = payload.trigger;
    if (cookies.length > 0) request.cookies = cookies;

    const result = await nativeCall(request);

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
    const badge: chrome.action.BadgeTextDetails = { text };
    const badgeColor: chrome.action.BadgeColorDetails = { color };
    if (tabId !== undefined) {
      badge.tabId = tabId;
      badgeColor.tabId = tabId;
    }
    chrome.action.setBadgeBackgroundColor(badgeColor);
    chrome.action.setBadgeText(badge);
    setTimeout(() => {
      const clear: chrome.action.BadgeTextDetails = { text: "" };
      if (tabId !== undefined) clear.tabId = tabId;
      chrome.action.setBadgeText(clear);
    }, 1500);
  }
});
