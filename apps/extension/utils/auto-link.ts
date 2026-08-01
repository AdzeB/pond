import { probe } from "@/utils/probe";
import { getSettings, setSettings } from "@/utils/settings";
import { discoverUrl, type PondSettings } from "@/utils/types";

const DEFAULT_PORT = 41610;

/** Asks Pond on loopback for a token; returns linked settings or null if Pond isn't there. */
export async function tryAutoLink(): Promise<PondSettings | null> {
  const current = await getSettings();
  const ports = new Set<number>([DEFAULT_PORT, current.port]);

  for (const port of ports) {
    try {
      const res = await fetch(discoverUrl(port), {
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        status?: string;
        data?: { port?: number; token?: string };
      };
      if (body.status !== "success" || !body.data?.token) continue;
      const next: PondSettings = {
        ...current,
        port:
          typeof body.data.port === "number" && body.data.port > 0
            ? body.data.port
            : port,
        apiKey: body.data.token,
      };
      const result = await probe(next);
      if (result.state !== "connected") continue;
      await setSettings(next);
      return next;
    } catch {
      /* try next port */
    }
  }
  return null;
}
