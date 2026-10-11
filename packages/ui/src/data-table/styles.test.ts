import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

function declarations(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start)).replace(/\s+/g, " ");
}

describe("data table overflow", () => {
  it("scrolls the sticky header with the rows", () => {
    const viewport = declarations(".viewport");
    expect(viewport).toContain("overflow: auto;");
    const header = declarations(".header-scroll");
    expect(header).toContain("position: sticky;");
    expect(header).toContain("top: 0;");
    expect(declarations(".body")).not.toContain("overflow");
  });

  it("lets the header and row backgrounds grow from their shared minimum", () => {
    for (const selector of [".header-row", ".row"]) {
      const rule = declarations(selector);
      expect(rule).toContain("width: 100%;");
      expect(rule).not.toContain("min-width: 0;");
    }
    expect(declarations(".sheet")).toContain("width: 100%;");
  });
});
