import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

it("uses gray 11 for primary icon buttons without changing primary text buttons", () => {
  const primaryStart = css.indexOf('&:where([data-variant="primary"]) {');
  const iconStart = css.indexOf("&:where([data-icon]) {", primaryStart);
  expect(primaryStart).toBeGreaterThanOrEqual(0);
  expect(iconStart).toBeGreaterThan(primaryStart);

  const primaryDefault = css.slice(primaryStart, iconStart);
  const iconDefault = css.slice(iconStart, css.indexOf("}", iconStart));
  expect(primaryDefault).toContain("var(--ds-gray-12)");
  expect(iconDefault).toContain("var(--ds-gray-11)");
});
