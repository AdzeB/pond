import { getSettings, setSettings } from "@/utils/settings";
import { libraryInfoUrl, type PondSettings } from "@/utils/types";

export interface LibraryInfo {
  name: string;
  counts: { active: number };
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

export async function getActiveTabUrl(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? null;
}
