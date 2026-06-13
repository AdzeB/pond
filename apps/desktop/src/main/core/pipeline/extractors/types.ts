import type { Source } from "@pond/schema/db";
import type { Capture, CaptureMedia } from "@pond/schema/raw";

// The persisted shapes live in `@pond/schema/raw`. The pipeline used
// to redeclare `Capture`/`CaptureMedia`/`CaptureMetrics`/`RawJson`
// here, which let them silently drift out of sync with the schema
// (e.g. `CaptureMetrics` lost the new metric keys). Re-export the
// canonical types so there is exactly one definition.
export type { Capture, RawJson } from "@pond/schema/raw";

// Historic alias: extractors still import `MediaCandidate` from this
// module. `CaptureMedia` IS the same shape (both use
// `"image" | "video" | "link"` for `type`), so keep the alias for
// backward compatibility instead of churning every extractor file.
export type MediaCandidate = CaptureMedia;

export interface ExtractInput {
  url: URL;
  fetch?: typeof fetch;
}

// Embedded test cases (yt-dlp `_TESTS` style). They travel with the extractor
// and are exercised generically by the test runner.
export interface ExtractorTest {
  /** An item URL this extractor must claim via `suitable`. */
  readonly url: string;
  /** Expected `source_id` parsed from `url` (checked offline). */
  readonly id?: string;
  /** A profile URL plus the handle `handleFromPath` should return from it. */
  readonly profile?: { readonly url: string; readonly handle: string };
}

export interface Extractor {
  readonly id: string;
  readonly source: Source;
  readonly validUrl: readonly RegExp[];
  /**
   * The cookie domain (leading-dot form, e.g. ".x.com") whose auth cookies
   * gate this source's scraping. `null` only for sources with no login.
   */
  readonly cookieDomain: string | null;
  /** True when a cookie of this name proves the user is signed in. */
  authCookies(name: string): boolean;
  /**
   * Parse the account handle from a profile URL's path segments, when the
   * source's list sync needs it. Omit for sources without account sync.
   */
  handleFromPath?(segments: string[]): string | null;
  /**
   * In-page JS expression (string) that returns the signed-in user's handle,
   * evaluated in a scrape window during account probing. Omit when unsupported.
   */
  readonly probeExpression?: string;
  /** Embedded test cases used by the extractor test runner. */
  readonly tests?: readonly ExtractorTest[];
  suitable(url: URL): boolean;
  extract(input: ExtractInput): Promise<Capture>;
}
