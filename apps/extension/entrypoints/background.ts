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
import { cookieDomainsForSource, isCookieSourceUrl } from "@/utils/url";

const AUTO_PUSH_COOLDOWN_MS = 60_000;
const ACTIVE_PROBE_MS = 30_000;
const IDLE_PROBE_MS = 5 * 60_000;
const SESSION_ALARM = "pond-session";
const SCHEDULER_STORAGE_KEY = "sessionPushScheduler";
const SAVE_MENU_ID = "pond-save";

const capturePayloadSchema = z.object({
  url: z.string(),
  trigger: z.string().optional(),
});

const pendingSessionSchema = z.object({ source: z.enum(SOURCES) });
const schedulerStateSchema = z.object({
  nextProbeAt: z.number().catch(0),
  failures: z.number().int().nonnegative().catch(0),
  pending: z.boolean().catch(false),
  lastPushAt: z.number().catch(0),
  lastPushSource: z.enum(SOURCES).nullable().catch(null),
});

type SchedulerState = z.infer<typeof schedulerStateSchema>;
type PendingProbe =
  | { kind: "pending"; source: Source }
  | { kind: "idle" }
  | { kind: "offline" };

const DEFAULT_SCHEDULER_STATE: SchedulerState = {
  nextProbeAt: 0,
  failures: 0,
  pending: false,
  lastPushAt: 0,
  lastPushSource: null,
};

export default defineBackground(() => {
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

  onMessage("pushSession", async ({ data }) => {
    try {
      const result = await pushSession(data);
      if (result.ok && result.data.connected) await markSchedulerIdle();
      return result;
    } catch (err) {
      console.error("[pond] pushSession threw", err);
      return {
        ok: false,
        reason: "network",
        detail: String(err),
      } satisfies PushSessionResult;
    }
  });

  onMessage("probe", async () => {
    try {
      return await probe();
    } catch (err) {
      console.warn("[pond] probe failed", err);
      return { state: "offline" as const };
    }
  });

  chrome.tabs.onActivated.addListener((info) => {
    void chrome.tabs
      .get(info.tabId)
      .then((tab) => {
        void maybeAutoPush({
          force: Boolean(tab.url && isCookieSourceUrl(tab.url)),
        });
      })
      .catch(() => {
        void maybeAutoPush();
      });
  });

  chrome.tabs.onUpdated.addListener((_id, change, tab) => {
    if (change.status !== "complete" || !tab.url) return;
    if (!isCookieSourceUrl(tab.url)) return;
    void maybeAutoPush({ force: true });
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SESSION_ALARM) void maybeAutoPush();
  });
  void readSchedulerState()
    .then((state) => scheduleSessionAlarm(state.pending))
    .catch(() => scheduleSessionAlarm(false))
    .finally(() => maybeAutoPush({ force: true }));

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

  async function fetchPendingSource(): Promise<PendingProbe> {
    const result = await nativeCall({ type: "session.pending" });
    if (!result.ok) return { kind: "offline" };
    const pending = pendingSessionSchema.safeParse(result.data);
    return pending.success
      ? { kind: "pending", source: pending.data.source }
      : { kind: "idle" };
  }

  async function readSchedulerState(): Promise<SchedulerState> {
    const stored = await chrome.storage.session.get(SCHEDULER_STORAGE_KEY);
    return schedulerStateSchema
      .catch(DEFAULT_SCHEDULER_STATE)
      .parse(stored[SCHEDULER_STORAGE_KEY]);
  }

  async function writeSchedulerState(state: SchedulerState): Promise<void> {
    await chrome.storage.session.set({ [SCHEDULER_STORAGE_KEY]: state });
  }

  function scheduleSessionAlarm(pending: boolean): void {
    chrome.alarms.create(SESSION_ALARM, {
      periodInMinutes: pending ? 0.5 : 5,
    });
  }

  async function markSchedulerIdle(): Promise<void> {
    await writeSchedulerState({
      ...DEFAULT_SCHEDULER_STATE,
      nextProbeAt: Date.now() + IDLE_PROBE_MS,
    });
    scheduleSessionAlarm(false);
  }

  async function maybeAutoPush(opts?: { force?: boolean }): Promise<void> {
    if (autoPushInFlight) return;
    autoPushInFlight = true;
    try {
      const now = Date.now();
      const state = await readSchedulerState();
      if (!opts?.force && now < state.nextProbeAt) return;

      const probeResult = await fetchPendingSource();
      if (probeResult.kind === "idle") {
        await markSchedulerIdle();
        return;
      }
      if (probeResult.kind === "offline") {
        const failures = state.failures + 1;
        const delay = Math.min(
          IDLE_PROBE_MS,
          ACTIVE_PROBE_MS * 2 ** Math.min(failures - 1, 4),
        );
        await writeSchedulerState({
          ...state,
          failures,
          nextProbeAt: now + delay,
        });
        scheduleSessionAlarm(state.pending);
        return;
      }

      const pending = probeResult.source;
      if (cookieDomainsForSource(pending).length === 0) {
        await markSchedulerIdle();
        return;
      }

      const nextState: SchedulerState = {
        ...state,
        failures: 0,
        pending: true,
        nextProbeAt: now + ACTIVE_PROBE_MS,
      };
      scheduleSessionAlarm(true);
      if (
        state.lastPushSource === pending &&
        now - state.lastPushAt < AUTO_PUSH_COOLDOWN_MS
      ) {
        await writeSchedulerState(nextState);
        return;
      }

      nextState.lastPushSource = pending;
      nextState.lastPushAt = now;
      await writeSchedulerState(nextState);
      const result = await pushSession(pending);
      if (result.ok && result.data.connected) {
        await markSchedulerIdle();
        flashBadge(undefined, "ok", "#1f9d55");
        return;
      }
      if (result.ok) return;
      if (result.reason === "network") {
        console.warn("[pond] auto-push failed", result.detail);
      }
    } finally {
      autoPushInFlight = false;
    }
  }

  async function pushSession(source: Source): Promise<PushSessionResult> {
    const domains = cookieDomainsForSource(source);
    if (domains.length === 0) {
      return { ok: false, reason: "no_cookies", detail: "source is public" };
    }

    const raw: chrome.cookies.Cookie[] = [];
    try {
      const batches = await Promise.all(
        domains.map((domain) => chrome.cookies.getAll({ domain })),
      );
      const seen = new Set<string>();
      for (const cookie of batches.flat()) {
        const key = `${cookie.name}\0${cookie.domain}\0${cookie.path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        raw.push(cookie);
      }
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
