import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { expect, it } from "vitest";
import { z } from "zod";
import { LibraryQueryRequestSchema } from "../../../shared/library-query";
import {
  McpLibraryQueryRequestSchema,
  parseMcpLibraryQuery,
} from "./mcp-library-query";

it("publishes the library query tool as JSON Schema", () => {
  expect(() => z.toJSONSchema(McpLibraryQueryRequestSchema)).not.toThrow();
  expect(() => z.toJSONSchema(LibraryQueryRequestSchema)).toThrow(
    /Custom types cannot be represented in JSON Schema/,
  );
});

it("accepts a nested library query and fills the empty default", () => {
  expect(parseMcpLibraryQuery({})).toMatchObject({ query: EMPTY_QUERY });
  expect(
    parseMcpLibraryQuery({
      keywords: "pond",
      query: {
        combinator: "and",
        rules: [
          {
            combinator: "or",
            rules: [{ field: "source", operator: "eq", value: "twitter" }],
          },
        ],
      },
    }),
  ).toMatchObject({
    keywords: "pond",
    query: {
      combinator: "and",
      rules: [
        {
          combinator: "or",
          rules: [{ field: "source", operator: "eq", value: "twitter" }],
        },
      ],
    },
  });
});
