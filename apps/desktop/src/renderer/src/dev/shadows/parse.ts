export interface ShadowColor {
  l: number;
  c: number;
  h: number;
  a: number;
}

export interface ShadowLayer {
  id: string;
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  light: ShadowColor;
  dark: ShadowColor;
}

interface ShadowColorPair {
  light: ShadowColor;
  dark: ShadowColor;
}

export interface ShadowToken {
  name: string;
  alias: string | null;
  layers: ShadowLayer[];
  raw: string;
}

const TOKEN_RE = /(--ds-shadow-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
const ALIAS_RE = /^var\(\s*(--ds-shadow-[a-z0-9-]+)\s*\)$/i;
const LENGTH_RE = /^((?:-?[\d.]+px)|0)\s+/;
const OKLCH_RE =
  /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i;

let layerId = 0;

export function parseShadowFile(css: string): ShadowToken[] {
  return [...css.matchAll(TOKEN_RE)].map((match) => {
    const name = match[1] ?? "";
    const raw = collapseWhitespace(match[2] ?? "");
    return parseToken(name, raw);
  });
}

export function parseToken(name: string, raw: string): ShadowToken {
  const value = collapseWhitespace(raw);
  const alias = value.match(ALIAS_RE)?.[1] ?? null;
  if (alias) {
    return { name, alias, layers: [], raw: value };
  }
  if (isColorValue(value)) {
    const { light, dark } = parseColor(value);
    return {
      name,
      alias: null,
      layers: [
        {
          id: nextLayerId(),
          inset: false,
          x: 0,
          y: 0,
          blur: 0,
          spread: 1,
          light,
          dark,
        },
      ],
      raw: value,
    };
  }
  return {
    name,
    alias: null,
    layers: splitTop(value, ",").map(parseLayer),
    raw: value,
  };
}

export function serializeShadowFile(tokens: ShadowToken[]): string {
  const body = tokens
    .map((token) => {
      const value = serializeValue(token);
      if (token.alias || token.layers.length <= 1) {
        return `  ${token.name}: ${value};`;
      }
      const layers = token.layers.map((layer, index) => {
        const comma = index < token.layers.length - 1 ? "," : "";
        return `    ${serializeLayer(layer)}${comma}`;
      });
      return `  ${token.name}:\n${layers.join("\n")};`;
    })
    .join("\n\n");
  return `:root {\n${body}\n}\n`;
}

export function serializeValue(token: ShadowToken): string {
  if (token.alias) return `var(${token.alias})`;
  if (token.name === "--ds-shadow-ring") {
    const ring = ringLayer(token) ?? token.layers[0];
    return ring ? ringBorderColor(ring) : token.raw;
  }
  if (token.layers.length === 0) return token.raw;
  return token.layers.map(serializeLayer).join(", ");
}

function isRingLayer(layer: ShadowLayer): boolean {
  return (
    !layer.inset &&
    layer.x === 0 &&
    layer.y === 0 &&
    layer.blur === 0 &&
    layer.spread > 0
  );
}

export function ringLayer(token: ShadowToken): ShadowLayer | undefined {
  return token.layers.find(isRingLayer);
}

export function ringBorderColor(layer: ShadowLayer): string {
  if (colorsEqual(layer.light, layer.dark)) return serializeOklch(layer.light);
  return `light-dark(${serializeOklch(layer.light)}, ${serializeOklch(layer.dark)})`;
}

export function depthShadow(token: ShadowToken): string {
  return token.layers
    .filter((layer) => !isRingLayer(layer))
    .map(serializeLayer)
    .join(", ");
}

export function defaultLayer(): ShadowLayer {
  return {
    id: nextLayerId(),
    inset: false,
    x: 0,
    y: 4,
    blur: 12,
    spread: 0,
    light: { l: 0, c: 0, h: 0, a: 0.08 },
    dark: { l: 0, c: 0, h: 0, a: 0.2 },
  };
}

function parseLayer(input: string): ShadowLayer {
  let rest = `${input.trim()} `;
  const inset = rest.startsWith("inset ");
  if (inset) rest = rest.slice("inset ".length).trimStart();
  const lengths: number[] = [];
  while (lengths.length < 4) {
    const match = rest.match(LENGTH_RE);
    if (!match) break;
    lengths.push(Number(match[1]?.replace("px", "")));
    rest = rest.slice(match[0].length);
  }
  const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
  const { light, dark } = parseColor(rest.trim());
  return { id: nextLayerId(), inset, x, y, blur, spread, light, dark };
}

function parseColor(input: string): ShadowColorPair {
  const value = input.trim();
  if (value.startsWith("light-dark(") && value.endsWith(")")) {
    const inner = value.slice("light-dark(".length, -1);
    const [lightSource, darkSource] = splitTop(inner, ",");
    const light = parseOklch(lightSource ?? "");
    const dark = parseOklch(darkSource ?? "");
    return { light, dark };
  }
  const color = parseOklch(value);
  return { light: color, dark: { ...color } };
}

function parseOklch(input: string): ShadowColor {
  const match = input.trim().match(OKLCH_RE);
  if (!match) return { l: 0, c: 0, h: 0, a: 0.1 };
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function serializeLayer(layer: ShadowLayer): string {
  const inset = layer.inset ? "inset " : "";
  const lengths = [layer.x, layer.y, layer.blur];
  if (layer.spread !== 0) lengths.push(layer.spread);
  const color = colorsEqual(layer.light, layer.dark)
    ? serializeOklch(layer.light)
    : `light-dark(${serializeOklch(layer.light)}, ${serializeOklch(layer.dark)})`;
  return `${inset}${lengths.map(px).join(" ")} ${color}`;
}

function serializeOklch(color: ShadowColor): string {
  return `oklch(${fmt(color.l, 4)} ${fmt(color.c, 4)} ${fmt(color.h, 2)} / ${fmt(color.a, 3)})`;
}

function colorsEqual(a: ShadowColor, b: ShadowColor): boolean {
  return a.l === b.l && a.c === b.c && a.h === b.h && a.a === b.a;
}

function splitTop(input: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const character of input) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function isColorValue(value: string): boolean {
  return /^(light-dark|oklch)\(/i.test(value);
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function px(value: number): string {
  const n = Number(fmt(value, 3));
  return n === 0 ? "0" : `${n}px`;
}

function nextLayerId(): string {
  layerId += 1;
  return `layer-${layerId}`;
}

function fmt(value: number, places: number): string {
  const rounded = Number(value.toFixed(places));
  return String(rounded);
}
