import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

describe("video chrome", () => {
  it("centers the preview guide beneath the tooltip", () => {
    const guide = css.match(/\.preview-line\s*\{(?<rules>[^}]*)\}/)?.groups
      ?.rules;
    expect(guide).toContain("left: 50%");
    expect(guide).toContain("transform: translateX(-50%)");
  });

  it("sizes chrome buttons to match the speed control", () => {
    const chromeButton = [
      ...css.matchAll(
        /\.controls\[data-chrome\] \.button\s*\{(?<rules>[^}]*)\}/g,
      ),
    ]
      .map((match) => match.groups?.rules)
      .join("\n");
    const chromeSpeed = css.match(
      /\.controls\[data-chrome\] \.speed\s*\{(?<rules>[^}]*)\}/,
    )?.groups?.rules;
    expect(chromeButton).toContain("width: var(--ds-size-sm)");
    expect(chromeButton).toContain("height: var(--ds-size-sm)");
    expect(chromeSpeed).toContain("width: var(--ds-size-sm)");
    expect(chromeSpeed).toContain("height: var(--ds-size-sm)");
    expect(chromeSpeed).toContain("padding: 0");
  });
});
