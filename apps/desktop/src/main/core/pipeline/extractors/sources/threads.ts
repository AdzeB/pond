import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
import { firstMatch, THREADS_PATTERNS } from "../url-patterns";

export class ThreadsPostExtractor implements Extractor {
  readonly id = "threads-post";
  readonly source = "threads" as const;
  readonly validUrl = THREADS_PATTERNS;
  readonly cookieDomain = ".threads.com";

  authCookies(name: string): boolean {
    return name === "sessionid";
  }

  handleFromPath(segments: string[]): string | null {
    const first = segments[0];
    return first?.startsWith("@") ? first.slice(1) : null;
  }

  readonly tests = [
    {
      url: "https://www.threads.com/@zuck/post/C8Example01",
      id: "C8Example01",
      profile: { url: "https://www.threads.com/@zuck", handle: "zuck" },
    },
    {
      url: "https://www.threads.net/@mosseri/post/C8Example02",
      id: "C8Example02",
    },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const code = match?.[1] ?? null;
    if (!code) throw new TerminalError("could not parse threads post code");

    const canonical = input.url.href;
    const handleFromUrl = input.url.pathname.match(/\/@([^/]+)\//)?.[1];

    const result = await fetchHtmlInWindow(canonical, "threads", code);
    const meta = (result.meta ?? {}) as Record<string, unknown>;

    const media: MediaCandidate[] = (result.mediaUrls ?? []).map((m) => ({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    }));

    const handle =
      (typeof result.author === "string"
        ? result.author.replace(/^@/, "")
        : undefined) ?? handleFromUrl;
    const author = {
      ...(typeof meta.authorName === "string" ? { name: meta.authorName } : {}),
      ...(handle ? { handle } : {}),
      ...(typeof meta.authorAvatar === "string"
        ? { avatarUrl: meta.authorAvatar }
        : {}),
      ...(handle ? { profileUrl: `https://www.threads.com/@${handle}` } : {}),
    };

    const metricsRaw = (meta.metrics ?? {}) as Record<string, unknown>;
    const metrics = pickNumbers(metricsRaw, ["likes", "replies", "reactions"]);

    return {
      id: code,
      source: "threads",
      url: canonical,
      title: result.title,
      description: result.description,
      ...(Object.keys(author).length > 0 ? { author } : {}),
      ...(typeof meta.publishedAt === "string"
        ? { publishedAt: meta.publishedAt }
        : {}),
      ...(typeof result.lang === "string" ? { lang: result.lang } : {}),
      media,
      ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
    };
  }
}

function pickNumbers<K extends string>(
  obj: Record<string, unknown>,
  keys: readonly K[],
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out;
}
