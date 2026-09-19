import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const directory = dirname(fileURLToPath(import.meta.url));
const mediaCss = readFileSync(resolve(directory, "styles.module.css"), "utf8");
const gridCss = readFileSync(
  resolve(directory, "../views/grid/styles.module.css"),
  "utf8",
);

function declarations(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start)).replace(/\s+/g, " ");
}

describe("card media elevation", () => {
  it("keeps the shared thumbnail shadow outside the clipped visual", () => {
    const thumbnail = declarations(mediaCss, ".thumb");
    expect(thumbnail).toContain("border-radius: var(--ds-radius-xs);");
    expect(thumbnail).toContain("box-shadow: var(--ds-shadow-2);");
  });

  it("does not clip the shared thumbnail shadow in grid cards", () => {
    const frame = declarations(gridCss, ".frame");
    expect(frame).not.toContain("overflow: hidden;");
    expect(frame).not.toContain("box-shadow:");
  });
});
