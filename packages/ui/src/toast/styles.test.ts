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

describe("toast alignment", () => {
  it("keeps the message and controls in one centered row", () => {
    const content = declarations(".content");
    expect(content).toContain("align-items: center;");
    expect(content).toContain("padding: 8px 8px 8px 12px;");
  });

  it("keeps the close button in normal flow", () => {
    const close = declarations(".close");
    expect(close).not.toContain("position: absolute;");
    expect(close).not.toContain("inset-block-start:");
    expect(close).not.toContain("translate:");
  });
});
