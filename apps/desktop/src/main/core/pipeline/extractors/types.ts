import type { Source } from "@pond/schema/db";
import type { Capture, CaptureMedia } from "@pond/schema/raw";

/** Re-export the canonical schema types so there's exactly one definition. */
export type { Capture, RawJson } from "@pond/schema/raw";

/** @deprecated Back-compat alias; `CaptureMedia` is the same shape. */
export type MediaCandidate = CaptureMedia;

export interface ExtractInput {
  url: URL;
  fetch?: typeof fetch;
}

/** Embedded test cases run generically by the test runner. */
interface ExtractorTest {
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
  /** Cookie domain (leading-dot) gating this source's auth; `null` if no login. */
  readonly cookieDomain: string | null;
  /** True when this cookie proves a signed-in session; `value` distinguishes anon cookies that reuse the name. */
  authCookies(name: string, value?: string): boolean;
  /** Parse the account handle from a profile URL's path segments. */
  handleFromPath?(segments: string[]): string | null;
  /** In-page JS expression returning the signed-in user's handle. */
  readonly probeExpression?: string;
  /** Embedded test cases used by the extractor test runner. */
  readonly tests?: readonly ExtractorTest[];
  suitable(url: URL): boolean;
  extract(input: ExtractInput): Promise<Capture>;
}
