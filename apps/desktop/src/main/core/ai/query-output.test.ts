import { expect, it } from "vitest";
import { queryOutputSchema } from "./query-output";

it("accepts numeric, tag and empty filters", () => {
  expect(queryOutputSchema.parse({ combinator: "and", rules: [] })).toEqual({
    combinator: "and",
    rules: [],
  });
  expect(
    queryOutputSchema.safeParse({
      combinator: "and",
      rules: [
        { field: "duration", operator: "gt", value: 300 },
        { field: "tags", operator: "some", value: ["design"] },
      ],
    }).success,
  ).toBe(true);
});

it("rejects unknown fields and operators instead of passing arbitrary output", () => {
  expect(
    queryOutputSchema.safeParse({
      combinator: "and",
      rules: [{ field: "execute", operator: "shell", value: "command" }],
    }).success,
  ).toBe(false);
});
