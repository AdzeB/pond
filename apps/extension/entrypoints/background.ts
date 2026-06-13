import type { Source } from "@pond/schema/db";
import type {
  ExtensionCookie,
  SessionImportResponse,
} from "@pond/schema/session";
import { onMessage } from "@/utils/messaging";
import { ensureSettings, getSettings } from "@/utils/settings";
import {
  enqueueUrl,
  type PushSessionResult,
  sessionImportUrl,
} from "@/utils/types";
import { cookieDomainForSource } from "@/utils/url";

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async () => {
    await ensureSettings();
    clearStaleBadge();
  });

  chrome.runtime.onStartup.addListener(clearStaleBadge);

  clearStaleBadge();

  function clearStaleBadge(): void {
    if (!chrome.action) return;
    chrome.action.setBadgeText({ text: "" }).catch(() => {});
  }

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

  async function pushSession(source: Source): Promise<PushSessionResult> {
    const settings = await getSettings();
    if (!settings.apiKey) {
      return { ok: false, reason: "unpaired" };
    }
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

    const cookies: ExtensionCookie[] = raw.map((c) => ({
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
    }));

    let res: Response;
    try {
      res = await fetch(sessionImportUrl(settings.port), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({ source, cookies }),
      });
    } catch (err) {
      return {
        ok: false,
        reason: "network",
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: "network", detail };
    }

    const body = (await res.json()) as {
      status?: string;
      data?: SessionImportResponse;
    };
    if (body.status !== "success" || !body.data) {
      return { ok: false, reason: "network", detail: "bad response shape" };
    }
    return { ok: true, data: body.data };
  }

  function normaliseSameSite(s: unknown): ExtensionCookie["sameSite"] {
    if (s === "no_restriction" || s === "lax" || s === "strict") return s;
    return "unspecified";
  }

  async function handleCapture(
    payload: { url: string; trigger?: string },
    tabId?: number,
  ): Promise<boolean> {
    if (!payload || typeof payload.url !== "string") return false;
    const settings = await getSettings();
    if (!settings.apiKey) {
      console.warn("[pond] missing apiKey; pair the extension via the popup");
      flashBadge(tabId, "!", "#dd9b00");
      return false;
    }

    let res: Response;
    try {
      res = await fetch(enqueueUrl(settings.port), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          url: payload.url,
          ...(payload.trigger ? { trigger: payload.trigger } : {}),
        }),
      });
    } catch (err) {
      console.error("[pond] enqueue fetch failed", err);
      flashBadge(tabId, "x", "#cc3333");
      return false;
    }

    if (!res.ok) {
      console.warn("[pond] enqueue rejected", res.status, await res.text());
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
