import { getSettings, setSettings } from "@/utils/settings";
import type { ThemeVars } from "@/utils/theme";
import { libraryInfoUrl, type PondSettings } from "@/utils/types";

export interface LibraryInfo {
  name: string;
  counts: { active: number };
  theme?: ThemeVars | null;
}

export type ProbeResult =
  | { state: "unpaired" }
  | { state: "offline" }
  | { state: "connected"; library: LibraryInfo };

export const loadSettings = getSettings;
export const saveSettings = setSettings;

export async function probe(settings: PondSettings): Promise<ProbeResult> {
  if (!settings.apiKey) return { state: "unpaired" };
  try {
    const res = await fetch(libraryInfoUrl(settings.port), {
      headers: { authorization: `Bearer ${settings.apiKey}` },
      signal: AbortSignal.timeout(1500),
    });
    if (res.status === 401) return { state: "unpaired" };
    if (!res.ok) return { state: "offline" };
    const body = (await res.json()) as {
      status?: string;
      data?: LibraryInfo;
    };
    if (body.status !== "success" || !body.data) return { state: "offline" };
    return { state: "connected", library: body.data };
  } catch {
    return { state: "offline" };
  }
}

/** Tab the user was on when they opened the extension (not the Pond app tab itself). */
export async function rememberSourceTab(tab: {
  id?: number;
  url?: string;
}): Promise<void> {
  const url = tab.url;
  if (!url || url.startsWith("chrome-extension://")) return;
  await chrome.storage.session.set({
    sourceTabId: tab.id ?? null,
    sourceTabUrl: url,
  });
}

export async function getSourceTabUrl(): Promise<string | null> {
  try {
    const stored = await chrome.storage.session.get([
      "sourceTabId",
      "sourceTabUrl",
    ]);
    if (typeof stored.sourceTabId === "number") {
      try {
        const tab = await chrome.tabs.get(stored.sourceTabId);
        if (tab.url && !tab.url.startsWith("chrome-extension://")) {
          return tab.url;
        }
      } catch {
        /* tab closed */
      }
    }
    if (
      typeof stored.sourceTabUrl === "string" &&
      !stored.sourceTabUrl.startsWith("chrome-extension://")
    ) {
      return stored.sourceTabUrl;
    }
  } catch {
    /* session storage unavailable */
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab?.url && !tab.url.startsWith("chrome-extension://")) return tab.url;
  return null;
}
