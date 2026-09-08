import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  depthShadow,
  parseShadowFile,
  ringLayer,
  serializeShadowFile,
  serializeValue,
} from "./parse";

const SHADOW_CSS = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../../../packages/theme/src/shadow/shadow.css",
  ),
  "utf8",
);

const SOURCE = `:root {
  --ds-shadow-ring: light-dark(oklch(0 0 0 / 0.06), oklch(1 0 0 / 0.1));

  --ds-shadow-1:
    0 1px 2px -1px light-dark(oklch(0 0 0 / 0.06), oklch(0 0 0 / 0.2)),
    0 2px 4px -1px light-dark(oklch(0 0 0 / 0.04), oklch(0 0 0 / 0.12));

  --ds-shadow-4: var(--ds-shadow-1);

  --ds-shadow-inset:
    inset 0 1px 1px oklch(0 0 0 / 0.067), inset 0 1px 3px oklch(0 0 0 / 0.067),
    inset 0 2px 5px oklch(0 0 0 / 0.1);

  --ds-shadow-popover: var(--ds-shadow-3);
}
`;

describe("parseShadowFile", () => {
  it("reads layered light-dark tokens, aliases, and inset stacks", () => {
    const tokens = parseShadowFile(SOURCE);
    const ring = tokens.find((token) => token.name === "--ds-shadow-ring");
    const one = tokens.find((token) => token.name === "--ds-shadow-1");
    const four = tokens.find((token) => token.name === "--ds-shadow-4");
    const inset = tokens.find((token) => token.name === "--ds-shadow-inset");

    expect(ring?.layers).toHaveLength(1);
    expect(ring?.layers[0]?.spread).toBe(1);
    expect(ring?.layers[0]?.light).toEqual({ l: 0, c: 0, h: 0, a: 0.06 });
    expect(ring?.layers[0]?.dark).toEqual({ l: 1, c: 0, h: 0, a: 0.1 });
    expect(ring && serializeValue(ring)).toBe(
      "light-dark(oklch(0 0 0 / 0.06), oklch(1 0 0 / 0.1))",
    );

    expect(one?.layers).toHaveLength(2);
    expect(one?.layers[0]?.spread).toBe(-1);
    expect(one && ringLayer(one)).toBeUndefined();

    expect(four?.alias).toBe("--ds-shadow-1");
    expect(four && serializeValue(four)).toBe("var(--ds-shadow-1)");

    expect(inset?.layers).toHaveLength(3);
    expect(inset?.layers.every((layer) => layer.inset)).toBe(true);
    expect(inset?.layers[0]?.light).toEqual(inset?.layers[0]?.dark);
  });

  it("round-trips aliases and light-dark recipes into pasteable CSS", () => {
    const css = serializeShadowFile(parseShadowFile(SOURCE));
    expect(css).toContain(
      "--ds-shadow-ring: light-dark(oklch(0 0 0 / 0.06), oklch(1 0 0 / 0.1));",
    );
    expect(css).toContain("  --ds-shadow-4: var(--ds-shadow-1);");
    expect(css).toContain("inset 0 1px 1px oklch(0 0 0 / 0.067)");
    expect(parseShadowFile(css).map((token) => token.name)).toEqual(
      parseShadowFile(SOURCE).map((token) => token.name),
    );
  });

  it("loads every token from shadow.css", () => {
    const tokens = parseShadowFile(SHADOW_CSS);
    expect(tokens.map((token) => token.name)).toEqual([
      "--ds-shadow-ring",
      "--ds-shadow-1",
      "--ds-shadow-2",
      "--ds-shadow-3",
      "--ds-shadow-4",
      "--ds-shadow-5",
      "--ds-shadow-6",
      "--ds-shadow-inset",
      "--ds-shadow-popover",
      "--ds-shadow-dialog",
      "--ds-shadow-search",
    ]);
    expect(
      tokens.filter((token) => token.alias).map((token) => token.name),
    ).toEqual([
      "--ds-shadow-4",
      "--ds-shadow-popover",
      "--ds-shadow-dialog",
      "--ds-shadow-search",
    ]);
    expect(
      tokens
        .filter((token) => token.alias === null)
        .every((token) => token.layers.length > 0),
    ).toBe(true);
  });

  it("keeps ring as a color and depth tokens without an outer 1px layer", () => {
    const tokens = parseShadowFile(SHADOW_CSS);
    const ring = tokens.find((token) => token.name === "--ds-shadow-ring");
    const one = tokens.find((token) => token.name === "--ds-shadow-1");
    expect(ring && serializeValue(ring)).toBe(
      "light-dark(oklch(0 0 0 / 0.06), oklch(1 0 0 / 0.1))",
    );
    expect(one && ringLayer(one)).toBeUndefined();
    expect(one && depthShadow(one)).toBe(
      "0 1px 2px -1px light-dark(oklch(0 0 0 / 0.06), oklch(0 0 0 / 0.2)), 0 2px 4px -1px light-dark(oklch(0 0 0 / 0.04), oklch(0 0 0 / 0.12))",
    );
  });
});
