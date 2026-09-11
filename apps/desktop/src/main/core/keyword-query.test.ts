import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { compileKeywordWhere, toFtsMatchQuery } from "./keyword-query";

describe("keyword grammar", () => {
  it("keeps plain terms as safe prefixes and quoted text as a phrase", () => {
    expect(toFtsMatchQuery("Suspiria lighting")).toBe(
      '"Suspiria"* AND "lighting"*',
    );
    expect(toFtsMatchQuery('"cat food" black')).toBe('"cat food" AND "black"*');
    expect(toFtsMatchQuery("cat dog", "any")).toBe('("cat"*) OR ("dog"*)');
    expect(toFtsMatchQuery(` "'*** `)).toBeNull();
  });

  it("honors grouped alternatives and exclusions", () => {
    expect(toFtsMatchQuery("(cat || dog) black -store")).toBe(
      '(("cat"* AND "black"*) NOT ("store"*)) OR (("dog"* AND "black"*) NOT ("store"*))',
    );
    expect(toFtsMatchQuery('-store "cat food"')).toBe(
      '("cat food") NOT ("store"*)',
    );
    expect(toFtsMatchQuery("cat NOT (dog OR store)")).toBe(
      '("cat"*) NOT ("dog"* OR "store"*)',
    );
  });

  it("supports negative-only searches through a SQL complement", () => {
    const where = compileKeywordWhere('-"cat food"');
    if (!where) throw new Error("Expected a keyword predicate");
    const compiled = new SQLiteSyncDialect().sqlToQuery(where);
    expect(compiled.params).toEqual(['"cat food"']);
    expect(compiled.sql).toContain("not (");
    expect(compiled.sql).toContain("select id from saves_fts");
  });

  it("rejects incomplete logic and caps adversarial complexity", () => {
    for (const query of [
      "cat OR",
      "(cat dog",
      "cat)",
      "cat AND OR dog",
      `${"(".repeat(33)}cat${")".repeat(33)}`,
    ]) {
      expect(() => compileKeywordWhere(query)).toThrow();
    }
    expect(() => toFtsMatchQuery("-cat")).toThrow("full-library keyword query");
    expect(compileKeywordWhere(" ")).toBeUndefined();
  });
});
