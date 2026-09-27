import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

it("matches small icon buttons for icon-only tabs", () => {
  expect(css).toContain("height: var(--ds-size-sm)");
  expect(css).toContain("width: var(--ds-size-sm)");
  expect(css).toContain("width: 14px");
  expect(css).toContain("height: 14px");
});
