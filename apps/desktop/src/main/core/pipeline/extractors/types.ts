import type { Source } from "@pond/schema/db";
import type { Capture, CaptureMedia } from "@pond/schema/raw";

export type { Capture, RawJson } from "@pond/schema/raw";

/** @deprecated Back-compat alias; `CaptureMedia` is the same shape. */
export type MediaCandidate = CaptureMedia;

export interface ExtractInput {
  url: URL;
  fetch?: typeof fetch;
}

interface ExtractorTest {
  readonly url: string;
  readonly id?: string;
  readonly profile?: { readonly url: string; readonly handle: string };
}

export interface Extractor {
  readonly id: string;
  readonly source: Source;
  readonly validUrl: readonly RegExp[];
  readonly cookieDomain: string | null;
  authCookies(name: string, value?: string): boolean;
  handleFromPath?(segments: string[]): string | null;
  readonly probeExpression?: string;
  readonly tests?: readonly ExtractorTest[];
  suitable(url: URL): boolean;
  extract(input: ExtractInput): Promise<Capture>;
}
