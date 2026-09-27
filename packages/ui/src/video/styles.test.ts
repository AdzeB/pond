import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

describe("video chrome", () => {
  it("keeps the playback speed control square", () => {
    const chromeSpeed = css.match(
      /\.controls\[data-chrome\] \.speed\s*\{(?<rules>[^}]*)\}/,
    )?.groups?.rules;
    expect(chromeSpeed).toContain("width: 24px");
    expect(chromeSpeed).toContain("height: 24px");
    expect(chromeSpeed).toContain("padding: 0");
  });
});
