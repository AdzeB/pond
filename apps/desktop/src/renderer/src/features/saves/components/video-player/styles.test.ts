import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

describe("video transport layout", () => {
  it("opens volume above the mute button without taking transport space", () => {
    const popover = css.match(/\.volumePopover\s*\{(?<rules>[^}]*)\}/)?.groups
      ?.rules;
    expect(popover).toContain("position: absolute");
    expect(popover).toContain("bottom: calc(100% + 8px)");
    expect(popover).toContain("pointer-events: none");
    expect(popover).toContain("opacity: 0");
    expect(css).toMatch(
      /\.volumeControl:hover \.volumePopover,[\s\S]*?\.volumeControl:focus-within \.volumePopover\s*\{[\s\S]*?pointer-events: auto;[\s\S]*?opacity: 1/,
    );
  });
});
