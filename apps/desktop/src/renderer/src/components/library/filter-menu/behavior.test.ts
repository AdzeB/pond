import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { buildWhere } from "@pond/schema/filters";
import { readColorMatch } from "@pond/schema/filters/color";
import { matches } from "@pond/schema/filters/match";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { dedupePredicates } from "@/lib/search/nl-query";
import { validatePlan } from "@/lib/search/nl-validate";
import { rangePredicate } from "./custom-filter";
import { changeChoiceMode, isChoiceSelected, selectChoice } from "./selection";

const query = (rules: Predicate[]): Query => ({ combinator: "and", rules });
const tag = (value: string): Predicate => ({
  field: "tags",
  operator: "some",
  value: [value],
});
const base = { id: "save", source: "local", url: "" };

describe("filter dropdown matching", () => {
  it("combines Any/All with exclusions, and moves a value between inclusion and exclusion", () => {
    let rows = selectChoice([], tag("design"), true, "any");
    rows = selectChoice(rows, tag("motion"), true, "any");
    expect(matches(query(rows), { ...base, tags: ["motion"] })).toBe(true);
    rows = changeChoiceMode(rows, "tags", "all");
    expect(matches(query(rows), { ...base, tags: ["motion"] })).toBe(false);
    expect(matches(query(rows), { ...base, tags: ["motion", "design"] })).toBe(
      true,
    );
    rows = selectChoice(rows, tag("archive"), true, "exclude");
    expect(
      matches(query(rows), { ...base, tags: ["motion", "design", "archive"] }),
    ).toBe(false);
    expect(matches(query(rows), { ...base, tags: ["motion", "design"] })).toBe(
      true,
    );
    rows = selectChoice(rows, tag("motion"), true, "exclude");
    expect(isChoiceSelected(rows, tag("motion"), "any")).toBe(false);
    expect(isChoiceSelected(rows, tag("motion"), "exclude")).toBe(true);
    rows = selectChoice(rows, tag("motion"), false, "exclude");
    expect(isChoiceSelected(rows, tag("archive"), "exclude")).toBe(true);
    expect(matches(query(rows), { ...base, tags: ["design"] })).toBe(true);
  });

  it("supports excluded scalar choices and replacing an empty selection", () => {
    const type: Predicate = { field: "type", operator: "eq", value: "video" };
    const rows = selectChoice([], type, true, "exclude");
    expect(matches(query(rows), { ...base, mediaType: "video" })).toBe(false);
    expect(matches(query(rows), { ...base, mediaType: "image" })).toBe(true);
    expect(
      selectChoice(
        [{ field: "tags", operator: "empty", value: true }],
        tag("design"),
        true,
        "all",
      ),
    ).toEqual([{ field: "tags", operator: "every", value: ["design"] }]);
  });

  it("supports open and exact ranges, duration units, zero, and rejects invalid bounds", () => {
    expect(rangePredicate("duration", "", "2", 60)).toEqual({
      field: "duration",
      operator: "lte",
      value: 120,
    });
    expect(rangePredicate("duration", "1.5", "2", 60)).toEqual({
      field: "duration",
      operator: "between",
      value: [90, 120],
    });
    expect(rangePredicate("fileCount", "0", "0")).toEqual({
      field: "fileCount",
      operator: "eq",
      value: 0,
    });
    for (const [a, b] of [
      ["2", "1"],
      ["-1", ""],
      ["1.5", ""],
      ["Infinity", ""],
    ])
      expect(rangePredicate("fileCount", a ?? "", b ?? "")).toBeNull();
    expect(rangePredicate("savedAt", "2026-02-30", "")).toBeNull();
    expect(rangePredicate("savedAt", "bad", "")).toBeNull();
    const end = new Date("2026-09-01T00:00:00");
    end.setMilliseconds(-1);
    expect(rangePredicate("savedAt", "", "2026-08-31")).toEqual({
      field: "savedAt",
      operator: "lte",
      value: end.toISOString(),
    });
  });

  it("uses color tolerance and validates the value without breaking existing color shortcuts", () => {
    const save = { ...base, dominantColors: ["#ff0000"] };
    expect(
      matches(
        query([
          {
            field: "color",
            operator: "near",
            value: { hex: "#ee0000", tolerance: 20 },
          },
        ]),
        save,
      ),
    ).toBe(true);
    expect(
      matches(
        query([
          {
            field: "color",
            operator: "near",
            value: { hex: "#ee0000", tolerance: 0 },
          },
        ]),
        save,
      ),
    ).toBe(false);
    expect(
      matches(
        query([{ field: "color", operator: "near", value: "#ff0000" }]),
        save,
      ),
    ).toBe(true);
    for (const value of [
      { hex: "#ff0000", tolerance: -1 },
      { hex: "#ff0000", tolerance: Infinity },
      { hex: "bad", tolerance: 30 },
    ])
      expect(readColorMatch(value)).toBeNull();
    const rule: Predicate = {
      field: "color",
      operator: "near",
      value: { hex: "#ff0000", tolerance: 25 },
    };
    expect(validatePlan({ filter: query([rule]) }).filter).toEqual(
      query([rule]),
    );
  });

  it("retains distinct content, matching modes and negation when deduplicating", () => {
    const rows: Predicate[] = [
      tag("design"),
      { ...tag("design"), operator: "every" },
      { ...tag("design"), negate: true },
      { field: "note", operator: "contains", value: "alpha" },
      { field: "note", operator: "contains", value: "beta" },
    ];
    expect(dedupePredicates([...rows, ...rows])).toEqual(rows);
    expect(validatePlan({ filter: query(rows) }).filter).toEqual(query(rows));
  });

  it("matches content and literal SQL wildcards consistently in memory and SQLite", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(
        "create table saves (id text, notes text, description text, caption text, transcript text)",
      );
      const saves = [
        {
          ...base,
          id: "literal",
          notes: "  100% Design_1 \\ Draft  ",
          description: null,
          caption: "Motion Design",
          transcript: "Hello DESIGN",
        },
        {
          ...base,
          id: "other",
          notes: "1000 DesignX1",
          description: null,
          caption: "Motion",
          transcript: null,
        },
        {
          ...base,
          id: "missing",
          notes: null,
          description: null,
          caption: " ",
          transcript: "",
        },
      ];
      const insert = db.prepare("insert into saves values (?, ?, ?, ?, ?)");
      for (const save of saves)
        insert.run(
          save.id,
          save.notes,
          save.description ?? null,
          save.caption,
          save.transcript,
        );
      for (const field of ["note", "caption", "transcript"] as const) {
        for (const rule of [
          { field, operator: "contains" as const, value: "design" },
          { field, operator: "contains" as const, value: "%" },
          { field, operator: "contains" as const, value: "_" },
          { field, operator: "contains" as const, value: "\\" },
          { field, operator: "exists" as const, value: false },
        ]) {
          const filter = query([rule]);
          const where = buildWhere(filter);
          if (!where) throw new Error("Missing SQL predicate");
          const sql = new SQLiteSyncDialect().sqlToQuery(where);
          const params = sql.params.map((value): SQLInputValue => {
            if (
              value === null ||
              typeof value === "string" ||
              typeof value === "number"
            )
              return value;
            throw new Error("Unexpected SQL parameter");
          });
          expect(
            db
              .prepare(`select id from saves where ${sql.sql}`)
              .all(...params)
              .map((row) => row.id),
            `${field} ${String(rule.value)}`,
          ).toEqual(
            saves
              .filter((save) => matches(filter, save))
              .map((save) => save.id),
          );
        }
      }
    } finally {
      db.close();
    }
  });
});
