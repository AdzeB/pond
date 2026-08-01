const DEFAULT_PORT = 41610;

export function parsePairingLink(
  raw: string,
): { token: string; port: number } | null {
  try {
    const cleaned = raw.trim().replace(/^[<"']|[>"']$/g, "");
    if (!cleaned.startsWith("pond://pair")) return null;
    const url = new URL(cleaned.replace(/^pond:\/\//, "http://"));
    const portRaw = url.searchParams.get("port") ?? String(DEFAULT_PORT);
    const port = Number.parseInt(portRaw, 10) || DEFAULT_PORT;
    const token = url.searchParams.get("token") ?? "";
    if (!token) return null;
    return { token, port };
  } catch {
    return null;
  }
}

/** Accepts a full pond://pair link or a bare token (uses defaultPort). */
export function parsePairingInput(
  raw: string,
  defaultPort = DEFAULT_PORT,
): { token: string; port: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fromLink = parsePairingLink(trimmed);
  if (fromLink) return fromLink;
  if (/^[A-Za-z0-9._~-]{16,}$/.test(trimmed)) {
    return { token: trimmed, port: defaultPort };
  }
  return null;
}
