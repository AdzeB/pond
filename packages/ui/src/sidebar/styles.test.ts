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

describe("sidebar scroll viewport", () => {
  it("scrolls overflowing content vertically", () => {
    const scroll = declarations(".scroll");
    expect(scroll).toContain("overflow-y: auto;");
    expect(scroll).not.toContain("overflow: visible;");
  });
});
