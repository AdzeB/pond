import { describe, expect, it } from "vitest";
import { formatOutput } from "./output";

describe("formatOutput", () => {
  it("wraps JSON in a versioned envelope", () => {
    expect(
      formatOutput({ id: "save-1" }, { format: "json", compact: true }),
    ).toBe('{"schemaVersion":"1","data":{"id":"save-1"}}\n');
  });

  it("keeps NDJSON records on separate lines", () => {
    expect(formatOutput([1, 2], { format: "ndjson" })).toBe(
      '{"schemaVersion":"1","data":1}\n{"schemaVersion":"1","data":2}\n',
    );
  });

  it("extracts paths without other output", () => {
    expect(
      formatOutput(
        [{ path: "/one", title: "One" }, { url: "https://example.com" }],
        { format: "human", paths: true },
      ),
    ).toBe("/one\nhttps://example.com\n");
  });
});
