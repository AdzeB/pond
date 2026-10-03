import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "volume/styles.module.css",
  ),
  "utf8",
);

describe("video transport layout", () => {
  it("opens volume above the mute button without taking transport space", () => {
    const popover = css.match(/\.popover\s*\{(?<rules>[^}]*)\}/)?.groups
      ?.rules;
    expect(popover).toContain("position: absolute");
    expect(popover).toContain("bottom: calc(100% + 8px)");
    expect(popover).toContain("pointer-events: none");
    expect(popover).toContain("opacity: 0");
    expect(css).toMatch(
      /\.control:hover \.popover,[\s\S]*?\.control:focus-within \.popover\s*\{[\s\S]*?pointer-events: auto;[\s\S]*?opacity: 1/,
    );
  });
});
