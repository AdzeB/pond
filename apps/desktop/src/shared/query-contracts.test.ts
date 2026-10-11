import type { Query } from "@pond/schema/filters/types";
import { describe, expectTypeOf, it } from "vitest";
import type {
  QueryArguments,
  QueryInput,
  QueryName,
  QueryResult,
} from "./query-contracts";
import type { WireSave } from "./wire";

describe("desktop query contracts", () => {
  it("keeps operation names closed", () => {
    expectTypeOf<string>().not.toExtend<QueryName>();
    expectTypeOf<"savedViews.create">().toExtend<QueryName>();
  });
  it("carries filter domain types through saved views", () => {
    expectTypeOf<QueryInput<"savedViews.create">["query"]>().toEqualTypeOf<
      Query | null | undefined
    >();
    expectTypeOf<
      QueryInput<"savedViews.update">["patch"]["query"]
    >().toEqualTypeOf<Query | null | undefined>();
  });
  it("retains missing save and no-input operation contracts", () => {
    expectTypeOf<QueryResult<"saves.get">>().toEqualTypeOf<WireSave | null>();
    expectTypeOf<[]>().toExtend<QueryArguments<"savedViews.list">>();
    expectTypeOf<[]>().not.toExtend<QueryArguments<"saves.get">>();
  });

  it("types related Save recommendations as a read-only result", () => {
    expectTypeOf<QueryInput<"saves.related">>().toEqualTypeOf<{
      id: string;
      limit?: number;
    }>();
    expectTypeOf<QueryResult<"saves.related">>().toEqualTypeOf<{
      items: Array<{
        id: string;
        score: number;
        reason: "semantically-related" | "already-organized";
      }>;
    }>();
  });
});
