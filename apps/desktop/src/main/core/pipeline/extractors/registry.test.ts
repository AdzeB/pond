import { EXTERNAL_SOURCE_IDS } from "@pond/schema/sources";
import { describe, expect, it } from "vitest";
import { sourceIdFromUrl } from "../url";
import { EXTRACTOR_LIST, extractorFor, resolveExtractor } from ".";

// Set POND_LIVE=1 (via `pnpm test:live`) to additionally hit the network and
// confirm each sample URL is still reachable. PR CI runs offline only.
const LIVE = process.env.POND_LIVE === "1";

describe("extractor registry", () => {
  it("has exactly one extractor per external source", () => {
    expect(EXTRACTOR_LIST).toHaveLength(EXTERNAL_SOURCE_IDS.length);
    for (const id of EXTERNAL_SOURCE_IDS) {
      expect(extractorFor(id)?.source).toBe(id);
    }
  });

  it("has no extractor for local", () => {
    expect(extractorFor("local")).toBeNull();
  });

  it("uses unique extractor ids", () => {
    const ids = EXTRACTOR_LIST.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

for (const extractor of EXTRACTOR_LIST) {
  describe(`extractor: ${extractor.id}`, () => {
    const tests = extractor.tests ?? [];

    it("declares at least one embedded test", () => {
      expect(tests.length).toBeGreaterThan(0);
    });

    for (const sample of tests) {
      it(`routes ${sample.url}`, () => {
        expect(extractor.suitable(new URL(sample.url))).toBe(true);
        expect(resolveExtractor(sample.url).id).toBe(extractor.id);
      });

      if (sample.id !== undefined) {
        it(`parses source id from ${sample.url}`, () => {
          expect(sourceIdFromUrl(extractor.source, sample.url)).toBe(sample.id);
        });
      }

      if (sample.profile) {
        const { url, handle } = sample.profile;
        it(`parses handle from ${url}`, () => {
          const segments = new URL(url).pathname.split("/").filter(Boolean);
          expect(extractor.handleFromPath?.(segments)).toBe(handle);
        });
      }

      it.skipIf(!LIVE)(`reaches ${sample.url} (live)`, async () => {
        const res = await fetch(sample.url, { redirect: "follow" });
        expect(res.status).toBeLessThan(500);
      });
    }
  });
}
