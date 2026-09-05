import { describe, expect, it } from "vitest";
import { z } from "zod";
import { query, StringParam } from "./params";

describe("query transport parsing", () => {
  it("applies legacy coercion before invoking a domain operation", () => {
    const operation = query(z.object({ id: StringParam }), ({ id }) => id);
    expect(operation({ id: 42 })).toBe("42");
    expect(operation()).toBe("");
  });
  it("rejects malformed required input before invoking the operation", () => {
    const handled: string[][] = [];
    const operation = query(z.object({ ids: z.array(z.string()) }), ({ ids }) =>
      handled.push(ids),
    );
    expect(() => operation({ ids: "wrong" })).toThrow();
    expect(handled).toEqual([]);
    operation({ ids: ["save-1"] });
    expect(handled).toEqual([["save-1"]]);
  });
});
