/** Mirrors the desktop renderer's boot script: the whole --ds-* palette derives from these anchors. */
export interface ThemeVars {
  mode: "light" | "dark";
  bgL: number;
  bgC: number;
  bgH: number;
  fgL: number;
  fgC: number;
  fgH: number;
  accentL: number;
  accentC: number;
  accentH: number;
  contrast: number;
  background?: string;
}
