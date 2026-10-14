# Theme color algorithm research

**Research date:** October 12, 2026  
**Scope:** How Pond turns a `ThemeDef` (background, foreground, accent, contrast) into `--ds-*` color tokens, how state-of-the-art systems solve the same problem, and a proposed replacement algorithm. No code was changed.  
**Source policy:** External claims link to the owning spec, source file, or author post. Where only a secondary source exists, the text says so. Measurements of Pond's current output come from a throwaway script that reimplements Pond's math from [`ramps.ts`](../../packages/theme/src/colors/ramps.ts) and [`color.ts`](../../packages/schema/src/color.ts), plus one live check in Chromium 148.

## Answer

Pond's theme math is a good skeleton (OKLCH anchors, one `contrast` input, runtime CSS) but it guarantees nothing about the result. Measured against all 30 presets:

- **Text on the accent fill fails in light mode.** The `accent` Button draws `--ds-gray-1` on `--ds-accent-9`. That is 3.30:1 for the default light theme and below 4.5:1 for 13 of 15 light presets, at every slider value.
- **The contrast slider works backwards for surfaces and borders.** Raising it pushes steps 2 to 8 *toward* the background. At 100, `--ds-gray-2` through `--ds-gray-5` all collapse to a 1% mix (1.02:1 against `--ds-gray-1`), so hover, active, and selected backgrounds disappear.
- **Status text is unreadable in dark mode.** The static hue ramps have one light-mode lightness table. `--ds-red-11` (38 uses, mostly error text) is 2.38:1 on the default dark `--ds-gray-2`.
- **Many colors are outside the gamut, and Chromium clips them.** 96 of 204 static ramp colors are outside sRGB. With the 1.4x P3 boost, 130 of 204 are outside Display P3, and the boosted accent leaves P3 for 24 of 30 presets. Chromium clips each channel instead of gamut mapping.
- **OKLCH mixing can swing hue.** `color-mix(in oklch, …)` with a pure-neutral anchor written as `oklch(L 0 0)` sweeps hue through the short arc. Chromium returns hue 80 for a 50% mix of hue 160 and `oklch(1 0 0)`. The shipped presets keep the visible error under one just-noticeable difference, but custom themes can reach it.

**Recommendation:** compute the full token set in TypeScript at theme-apply time. Use one pure function that solves each step against a WCAG 2 contrast target, maps every color into the display gamut, and derives the on-accent text color and the alpha tokens. Map the slider to Material-style contrast levels, where 50 reproduces today's look. Keep every existing token name, add `--ds-accent-contrast`, and implement in-house. Use `culori` only as a test-time oracle. Do not ship APCA until the team has reviewed its license.

## 1. Current Pond algorithm

| Stage | File | What it does |
| --- | --- | --- |
| Input | [`prefs.types.ts`](../../packages/schema/src/prefs.types.ts), [`theme-presets.ts`](../../packages/schema/src/theme-presets.ts) | `ThemeDef { background, foreground, accent, contrast }`, contrast 0 to 100, default 50. 15 light and 15 dark presets. |
| Anchors | [`color.ts`](../../packages/schema/src/color.ts) | `hexToOklch` uses Ottosson's sRGB to OKLab matrices. Hue is forced to `0` when chroma is below `1e-4`. `contrastMultiplier = 0.6 + contrast / 100 * 0.8`, so the range is 0.6 to 1.4. `isDark = bg.l < fg.l`. |
| Runtime write | [`theme-applier.tsx`](../../apps/desktop/src/renderer/src/features/settings/effects/theme-applier.tsx) | Writes `--ds-{bg,fg,accent}-{l,c,h}` and `--ds-contrast` on `:root`. On `(color-gamut: p3)` it multiplies accent chroma by `P3_CHROMA_BOOST = 1.4`, with no gamut check. It persists the anchors as a shell hint. |
| First paint | [`boot-shell.ts`](../../apps/desktop/src/renderer/src/app/boot-shell.ts), [`main/theme.ts`](../../apps/desktop/src/main/theme.ts) | Boot replays the persisted anchors. Main resolves the same `themeCssVars` for window chrome. |
| Gray scale | [`ramps.ts`](../../packages/theme/src/colors/ramps.ts) to `scale.css` | `--ds-gray-N = color-mix(in oklch, fg X%, bg)`, where `X = clamp(1%, (0.5 + (t - 0.5) * contrast) * 100%, 99%)` over the fixed curve `GRAY_T = [0, .03, .06, .1, .15, .22, .3, .4, .52, .66, .82, 1]`. Alphas mix `fg` with `transparent` at the same percentage. |
| Accent scale | same | `--ds-accent-N = color-mix(in oklab, accent-solid M%, gray-N)`, with `ACCENT_MIX = [16, 22, 32, 46, 60, 74, 88, 96, 100, 100, 82, 70]`. Alphas mix the accent with `transparent`. |
| Hue ramps | same, to `palette.css` | 17 static hues (ruby to pink) by 12 steps. Every hue shares one lightness table (0.97 down to 0.38, step 9 at 0.575) and one chroma multiplier table. There is one chroma per hue, and a P3 block multiplies chroma by 1.4. There is no dark-mode set. |
| Other mixes | [`theme.css`](../../packages/theme/src/theme.css) and component CSS | `--ds-border-subtle` and 27 other `color-mix(in oklch, …)` sites in CSS. |

The website ([`globals.css`](../../apps/website/app/globals.css)) and its gallery dialog override the anchors in plain CSS to theme a region. That CSS-only path is a migration constraint (see section 6.7).

## 2. The suspected weaknesses, measured

Method: reimplement Pond's formulas. Mix as the CSS spec defines (OKLCH shorter-arc hue, OKLab linear), clip channels in the display space as Chromium does (section 5.2), then compute WCAG 2 contrast ratios ([WCAG 2.2 definition](https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio)). The script also computes APCA Lc values from the published constants ([apca-w3 source](https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js)). The APCA figures are analysis only; see section 4 for the license. Results are for an sRGB display unless stated.

| # | Claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | OKLCH mixing swings hue; powerless hue behaves differently from OKLab mixing | **Confirmed, small for presets** | CSS Color 4 makes a hue powerless only when a color space conversion produces it. A hue written by hand "acts as normal" ([CSS Color 4 §4.4.1](https://www.w3.org/TR/css-color-4/#powerless)), and interpolation uses the shorter arc by default ([§13.5](https://www.w3.org/TR/css-color-4/#hue-interpolation)). Pond writes `oklch(L 0 0)` for neutral anchors. In Chromium 148, `color-mix(in oklch, oklch(0.25 0.03 160) 50%, oklch(1 0 0))` computes to `oklch(0.625 0.015 80)`. With `oklch(1 0 none)` or `#ffffff` as the second color it stays at hue 160. Presets: the largest difference from OKLab mixing is ΔEOK 0.0096 (Aurora). Custom white background with `#0B1F18` text: steps sweep hue 0 to 169, with up to ΔEOK 0.020, which is one JND ([§14.2.1](https://www.w3.org/TR/css-color-4/#GMA-Binary-local-MINDE)). |
| 2 | No step is validated against a contrast metric | **Confirmed** | `--ds-gray-11` on `--ds-gray-2` falls below 4.5:1 for 21 of 30 presets at slider 0. `--ds-accent-11` on `--ds-gray-2` falls below 4.5:1 for 12 of 30 at the preset slider value (default light 3.77:1, Seafoam 2.77:1). `--ds-gray-7` never reaches the 3:1 non-text threshold ([SC 1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast)): 2.10:1 by default. |
| 3 | The slider scales mix distance around 50%, not perceptual contrast | **Confirmed, and inverted below 50%** | Steps with `t < 0.5` move toward the background as contrast rises. Default light, ratio against `--ds-gray-1`: slider 0 gives `1.69 1.77 1.88 2.04 2.29 2.63 3.14` for steps 2 to 8. Slider 100 gives `1.02 1.02 1.02 1.02 1.28 1.70 2.48`. Steps 2 to 5 hit the 1% clamp, so they render identical. `--ds-gray-12` ignores the slider. |
| 4 | No gamut mapping; the P3 boost and static ramps exceed the gamut | **Confirmed** | Out of sRGB: 96 of 204 base ramp colors, including yellow 6 to 12 and blue 1 to 4. Out of P3: 52 of 204 base colors and 130 of 204 boosted colors. The boosted accent leaves P3 for 24 of 30 presets. The default `#008FFF` becomes P3 `(-0.017, 0.233, 1.323)`. See section 5 for what Chromium does with these. |
| 5 | No derived text color for the solid accent | **Confirmed** | The `accent` Button uses `color: var(--ds-gray-1)` ([button styles](../../packages/ui/src/button/styles.module.css)). Light presets: 2.39:1 to 4.74:1, so 13 of 15 fail 4.5:1. Default light: white 3.30:1, black 6.37:1. Dark presets pass, because `--ds-gray-1` is near black. |
| 6 | One lightness curve for every hue ignores where each hue peaks | **Confirmed** | At L 0.575 the sRGB chroma ceiling is 0.120 for hue 100 (yellow) but 0.291 for hue 310 (purple). Pond's yellow-9 requests 0.155. Tailwind sets yellow-500 at L 79.5% and blue-500 at L 62.3% ([theme.css](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css)). |
| 7 | Dark mode ramps are generated once | **Confirmed for hue ramps** | Grays and accents follow bg and fg, but the same curve serves both modes. The hue ramps never change. On the default dark `--ds-gray-2`, red-11 is 2.38:1 (APCA Lc 15), orange-11 2.45:1, and green-11 2.75:1. |

One extra finding: **alpha tokens do not match their solid twins.** `--ds-gray-aN` uses the same percentage as `--ds-gray-N`. The alpha composites in gamma-encoded RGB, while the solid mixes in OKLCH. Over `--ds-gray-1`, the composite differs from the solid by up to ΔEOK 0.033 in light mode and 0.041 in dark mode (about 2 JND). Radix solves the alpha for each step so the composite lands on the solid. Its code comment says the browser blends 8-bit channels and rounds each one ([generate-radix-colors.tsx](https://github.com/radix-ui/website/blob/main/components/generate-radix-colors.tsx)). That comment is empirical, not a spec citation.

## 3. Survey of state-of-the-art approaches

### 3.1 Linear (base color, accent, contrast)

- **How it works:** Linear generates themes from three inputs, "base color, accent color, and contrast", instead of 98 hand-set variables. It moved from HSL to LCH so equal lightness looks equally light across hues ([Linear, How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)).
- **Contrast:** the contrast input "defines how contrasty a theme should be" and produces high-contrast themes for accessibility (same post). The post does not say which metric, if any, is targeted.
- **Dark mode:** light, dark, and custom themes share one generator (same post).
- **User colors:** to get a neutral look, they limited "how much chrome (blue in our case) was used in the calculations" (same post).
- **Gaps:** Linear has not published its formulas or source. "LCH" in the post does not say CIE LCH or OKLCH. Everything beyond the post is unknown.

### 3.2 Radix Colors and the custom palette generator

- **Scale semantics:** 12 steps with fixed jobs. 1 and 2 are backgrounds, 3 to 5 component backgrounds (normal, hover, pressed), 6 to 8 borders, 9 and 10 solids, 11 and 12 text. "Steps 11 and 12 … are guaranteed to Lc 60 and Lc 90 APCA contrast ratio on top of a step 2 background." Most step-9 colors expect white text; Sky, Mint, Lime, Yellow, and Amber expect dark text ([Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)). Pond's token names already follow this layout.
- **Dark mode:** separate, hand-tuned light and dark scales for every hue. The generator loads `${name}P3` and `${name}DarkP3` and picks the set by appearance ([generate-radix-colors.tsx](https://github.com/radix-ui/website/blob/main/components/generate-radix-colors.tsx), MIT per [LICENSE](https://github.com/radix-ui/website/blob/main/LICENSE)).
- **Generator inputs and outputs:** `{ appearance, accent, gray, background }` in. Out come 12-step accent and gray scales in sRGB hex and wide-gamut OKLCH, alpha scales in sRGB and P3, an `accentContrast` text color, and surfaces (same file).
- **How the generator works** (same file):
  1. Find the two hand-tuned scales nearest the input by ΔEOK, blend them by a triangle-geometry ratio, then set every step's hue to the input hue. Chroma scales by the input's ratio, capped at 1.5 times the input.
  2. Shift the lightness progression so step 1 meets the requested background, with a Bézier ease (light `[0, 2, 0, 2]`, dark `[1, 0, 1, 0]`).
  3. Step 9 is the exact input accent, unless it sits within ΔEOK 0.25 of the scale's step 1 (white on white or black on black). Step 10 is `L ± 0.03 / (L + 0.1)`, with chroma times 0.93 when lightening.
  4. Cap steps 11 and 12 at `max(C8, C9)` chroma.
  5. Text on step 9 is white, unless white's APCA |Lc| is below 40. Then it is `oklch(0.25, max(0.08 C, 0.04), H)`.
  6. Alphas are solved per channel so the composite over the background matches the solid.
- **Gamut:** sRGB hex comes from colorjs.io `to("srgb").toString()`. Color.js gamut-maps string output by default ([Color.js gamut mapping](https://colorjs.io/docs/gamut-mapping)). Wide-gamut output is OKLCH strings.
- **Hue-dependent lightness:** inherited from the hand-tuned templates. Yellow and lime keep a high step 9.

### 3.3 Material Color Utilities: HCT, DynamicColor, contrast levels

- **Color space:** HCT is CAM16 hue and chroma plus L\* tone. "A difference of 40 in HCT tone guarantees a contrast ratio >= 3.0, and a difference of 50 guarantees a contrast ratio >= 4.5" ([hct.ts](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/hct/hct.ts)). The solver returns an sRGB color, and "the color returned may be lower than the requested chroma." That is gamut mapping by chroma reduction (same file).
- **Contrast metric:** the WCAG 2 ratio `(lighter + 5) / (darker + 5)` on Y, with helpers that solve the tone for a target ratio ([contrast.ts](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/contrast/contrast.ts)).
- **Contrast levels:** `ContrastCurve(low, normal, medium, high)` holds one value per level at -1, 0, 0.5, and 1, interpolated linearly ([contrast_curve.ts](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/contrast_curve.ts)). Examples from the 2021 spec: `onSurface (4.5, 7, 11, 21)`, `onSurfaceVariant (3, 4.5, 7, 11)`, `outline (1.5, 3, 4.5, 7)`. Surface tones also move with level, for example `surfaceDim` light `(87, 87, 80, 75)` ([color_spec_2021.ts](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/color_spec_2021.ts)). Every role, borders included, gets *more* contrast at higher levels. Pond's slider does the opposite for steps 2 to 8.
- **Solving:** each role keeps its default tone if it meets the ratio against its background, otherwise it moves to the nearest tone that does. Tones below 60 prefer a light foreground, and a background tone in 50 to 59 snaps to 49 or 60 ([dynamic_color.ts](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/dynamic_color.ts)).
- **Dark mode:** the same tonal palettes with different tones, for example `background` at T6 dark and T98 light ([color_spec_2021.ts](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/color_spec_2021.ts)).
- **User colors:** a source color seeds the palettes. Users do not set exact bg or fg values. Apache-2.0, npm `@material/material-color-utilities` 0.4.0.

### 3.4 Adobe Leonardo (contrast-ratio-targeted ramps)

- **Inputs:** `Theme({ colors, backgroundColor, lightness, contrast = 1, saturation, output, formula = 'wcag2' })`. Each `Color` has `colorKeys`, an interpolation `colorSpace`, and target `ratios` ([theme.js](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/lib/theme.js), [README](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md)).
- **Algorithm:** interpolate the keys into 3,000 swatches, then binary-search for the swatch whose contrast against the background matches each ratio, within 0.01. Negative ratios mean lighter than the background ([utils.js](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/lib/utils.js)).
- **Contrast slider:** `multiplyRatios` maps a ratio `r` to `(r - 1) * contrast + 1`, so 1:1 stays 1:1 and every step stretches proportionally (same file). This is the cleanest published model for a contrast slider.
- **Dark mode:** change the background `lightness` and the same ratios regenerate (README).
- **Metric:** `'wcag2'`, or `'wcag3'`, which calls `APCAcontrast` from `apca-w3` (utils.js). Apache-2.0, depends on `apca-w3`, `chroma-js`, `hsluv`, and `ciecam02` ([package.json](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/package.json)).
- **Gamut:** not handled explicitly. Keys are sRGB and interpolation happens in the chosen space.

### 3.5 Evil Martians Harmonizer (APCA-equalized OKLCH palettes)

- **Model:** "levels" are contrast targets, "hues" are angles. Each cell is an OKLCH color that hits its level's contrast against a background. Chroma is either the maximum for each hue or the maximum common chroma across all hues at that level (`chromaMode: "even"`), so one level means the same contrast and chroma for every hue ([README](https://github.com/evilmartians/harmonizer/blob/main/README.md), [maxCommonChroma.ts](https://github.com/evilmartians/harmonizer/blob/main/packages/core/src/utils/colors/maxCommonChroma.ts)).
- **Defaults:** APCA, P3, levels 100 to 900 at Lc `100, 90, 77, 65, 51, 65, 77, 90, 100`. Levels below `bgLightStart: 5` measure against the dark background, the rest against white ([defaultConfig.ts](https://github.com/evilmartians/harmonizer/blob/main/packages/core/src/defaultConfig.ts), [calculateColors.ts](https://github.com/evilmartians/harmonizer/blob/main/packages/core/src/utils/colors/calculateColors.ts)).
- **Engine:** `apcach` (MIT) with `crToBg` or `crToFg` and `maxChroma` ([calculateApcach.ts](https://github.com/evilmartians/harmonizer/blob/main/packages/core/src/utils/colors/calculateApcach.ts)). `apcach` depends on `apca-w3`, `culori`, and `wcag-contrast` (npm metadata).
- **Hue-dependent lightness:** equalizing contrast gives every hue nearly the same lightness at a level. That trades yellow's natural brightness for guaranteed text contrast.
- **License:** the repository root has no LICENSE file (checked at commit `4b45439`). Treat the code as reference only.

### 3.6 Tailwind CSS v4 palette

- **What ships:** literal OKLCH values in [`theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css). The v4 release moved the palette "from `rgb` to `oklch`" to use the wider gamut ([Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)).
- **Hue-dependent lightness and hue drift:** yellow-500 is `oklch(79.5% 0.184 86.047)` and blue-500 is `oklch(62.3% 0.214 259.815)`. Yellow's hue drifts from 102 at 50 to 54 at 950 (theme.css).
- **Neutrals:** `--color-neutral-500: oklch(55.6% 0 none)`. The `none` hue keeps neutrals from steering hue interpolation (theme.css).
- **Gamut:** no `@media (color-gamut)` blocks. Out-of-sRGB values go to the browser, which clips (section 5.2). I found no generator in the repo, so the method behind the values is unpublished.
- **Contrast and dark mode:** none built in. The palette is one static set.

### 3.7 Björn Ottosson: Oklab, Okhsl/Okhsv, gamut clipping

- **Gamut shape:** in Oklab, a hue slice of the sRGB gamut is close to a triangle. Its lower edge is a straight line from black to a cusp `(L_cusp, C_cusp)`. The cusp comes from a fitted polynomial plus one Halley step. The same method "should" work for other RGB spaces ([sRGB gamut clipping](https://bottosson.github.io/posts/gamutclipping/)).
- **Projection choice:** keep L and reduce C, project toward L = 0.5, project toward `L_cusp`, or use the adaptive variants. "Overall I think preserving lightness does the best." Code is MIT (same post).
- **Okhsl and Okhsv:** saturation is chroma relative to the most colorful in-gamut color at that hue and lightness. A new lightness estimate `L_r` tracks CIELab L\* closely, and Oklab L reads darker in the darks ([Okhsv and Okhsl](https://bottosson.github.io/posts/colorpicker/)). That relative-chroma idea is what Pond needs for P3 (section 5.4).

### 3.8 Comparison

| System | Inputs | Contrast | Gamut | Dark mode | Hue-aware lightness |
| --- | --- | --- | --- | --- | --- |
| Linear | base, accent, contrast | slider, metric unpublished | unpublished | same generator | unpublished |
| Radix custom | accent, gray, bg, appearance | APCA guarantees on 11 and 12 (curated scales), APCA Lc 40 rule for step 9 text | colorjs maps hex; OKLCH for P3 | separate dark templates | from templates |
| Material | source color, contrast level | WCAG 2 ratio curves for each role | HCT solver reduces chroma | tone mapping | via HCT tone |
| Leonardo | keys, ratios, bg lightness, contrast | WCAG 2 or APCA targets, multiplier | none | rerun at new bg | via keys |
| Harmonizer | levels (contrast), hues, bgs | APCA or WCAG targets per level | sRGB or P3 max chroma | levels measured against dark or light bg | equalized by contrast |
| Tailwind v4 | none (static) | none | browser clip | none | hand-tuned |
| Pond today | bg, fg, accent, contrast | none | none (1.4x boost) | bg and fg only | none |

## 4. Contrast metrics: WCAG 2 vs APCA

- **WCAG 2.2 is the standard.** It has been a W3C Recommendation since 12 December 2024. Contrast ratio is `(L1 + 0.05) / (L2 + 0.05)` on relative luminance with the 0.04045 sRGB threshold. Text needs 4.5:1 (3:1 for large text) under SC 1.4.3, 7:1 under 1.4.6, and UI components and graphics need 3:1 under 1.4.11 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- **WCAG 3 has not chosen a metric.** In the 10 September 2026 Working Draft, the text contrast requirement reads "@@[contrast measure to be determined]", and the draft notes that "the contrast algorithm used in WCAG 3 is yet to be determined" ([WCAG 3.0](https://www.w3.org/TR/wcag-3.0/)). APCA is not a W3C standard today.
- **APCA status:** `apca-w3` 0.1.9 implements base algorithm 0.0.98G-4g ([LICENSE.md](https://github.com/Myndex/apca-w3/blob/master/LICENSE.md)).
- **APCA license:** it is restrictive for Pond, an MIT-licensed Electron app ([package.json](../../package.json)). The license grants use "for web content only". It excludes "uses which are not specific to web-based content". It licenses other uses under "AGPU v3", presumably AGPL v3. It forbids modifying constants, requires staying on the latest version, and reserves a right to audit commercial apps (same file). This is not legal advice, but shipping `apca-w3` or a port of it in Pond needs a decision first. Leonardo and `apcach` depend on `apca-w3`, so they inherit the question.
- **CSS `contrast-color()`:** CSS Color 5 (Working Draft, 13 September 2026) defines it to return white or black, with a UA-defined algorithm. It warns against relying only on the WCAG 2.1 ratio, but says the result "should still meet" WCAG AA for large text ([CSS Color 5 §8](https://www.w3.org/TR/css-color-5/#contrast-color)). `CSS.supports('color', 'contrast-color(red)')` returns `true` in Chromium 148 (live check). It only guarantees 3:1, so it is a fallback, not the solution.
- **Which to use for Pond:** WCAG 2 as the hard gate in code and tests. It is normative, license-free, and the default in Material and Leonardo. The documented WCAG 2 weakness (mid-tone fills where white text reads better than the ratio says) shows up in Pond's accent buttons. White on `#008FFF` is 3.30:1 under WCAG 2 but APCA Lc 64.9, which passes Radix's Lc 40 rule. Treat that as a product decision (open question 2), not a metric switch.

## 5. Gamut mapping

### 5.1 What the spec requires

- Out-of-gamut values survive intermediate math. When the destination is a display, they "must be converted to an in-gamut color" ([CSS Color 4 §14.1](https://www.w3.org/TR/css-color-4/#gamut-mapping-intro)).
- The spec defines three algorithms: Binary Search with Local MINDE, EdgeSeeker (a lookup table of cusp and curvature per hue), and Ray Trace. All of them reduce chroma at constant lightness and hue in OKLCH, with relative colorimetric intent. L ≥ 1 maps to white and L ≤ 0 to black. One JND is ΔEOK 0.02 ([§14.2](https://www.w3.org/TR/css-color-4/#css-gamut-mapping)). The CSSWG resolved in August 2025 to "add these 2 algorithms … and require one of the three" ([csswg-drafts#10579](https://github.com/w3c/csswg-drafts/issues/10579)).
- Channel clipping shifts hue. The spec's own example moves 69° ([§14.1.1](https://www.w3.org/TR/css-color-4/#GM-clip)).

### 5.2 What Chromium and Electron do today

- **Pond's runtime:** Electron 44.4.0, which ships Chrome 152.0.7977.78 ([apps/desktop/package.json](../../apps/desktop/package.json), [Electron releases](https://releases.electronjs.org/releases.json)).
- **Shipped behavior is clipping.** The Chrome 110 Intent to Ship for CSS Color 4 excluded the gamut mapping section ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/r0QATT8-kOw/m/7WdN2Y_sAwAJ)). A Chromium engineer called the gamut mapper he "implemented in Chromium behind a flag" too complicated in retrospect ([ccameron-chromium, csswg-drafts#10579](https://github.com/w3c/csswg-drafts/issues/10579)). The Interop 2027 proposal (September 2026) says "only Firefox has shipped an implementation", behind a flag, and Chrome and WebKit are "reportedly looking into it" ([interop#1394](https://github.com/web-platform-tests/interop/issues/1394)). Firefox 154 enables it with `layout.css.gamut-mapping.method`, and Nightly 156 passes the WPT tests with the ray-trace method ([web-features#4286](https://github.com/web-platform-dx/web-features/issues/4286)).
- **The only mapping Chromium does:** OKLab and OKLCH lightness at or beyond 0 or 100 maps to black or white immediately before paint ([Chromium commit 71a936c](https://chromium.googlesource.com/chromium/src.git/+/71a936c76e12c63c3a4bee4034b5054151fdc55c)).
- **Live check in Chromium 148** (Cursor's browser, Electron 42, P3 display): painting `oklch(0.97 0.2235 258.41)` to an sRGB canvas reads back `rgb(145, 244, 255)`, a saturated cyan instead of a near-white tint. That is channel clipping. Pond's `--ds-blue-1`, `oklch(0.97 0.024 250)`, reads back `rgb(233, 247, 255)`, with the blue channel pinned at 255. I did not run this on Chrome 152. Running the same canvas readback in Pond's devtools would confirm it.
- **Why it matters for Pond:** the light steps suffer most. The gamut narrows sharply toward white ([interop#1394](https://github.com/web-platform-tests/interop/issues/1394)). At L 0.97, hue 250 fits only 0.015 chroma in sRGB and 0.016 in P3. Pond's blue-1 asks for 0.024 in sRGB and 0.034 in P3.

### 5.3 Computing the in-gamut chroma ceiling

For a given OKLCH `(L, h)`, `Cmax(L, h, gamut)` is the largest chroma whose linear RGB channels all lie in [0, 1]. Three options:

1. **Bisection (recommended).** Convert OKLCH to OKLab, then to linear sRGB with Ottosson's inverse matrices ([Oklab](https://bottosson.github.io/posts/oklab/)). For P3, go on to linear Display P3 through XYZ with the CSS Color 4 matrices ([sample code](https://www.w3.org/TR/css-color-4/#color-conversion-code)). Test `0 ≤ c ≤ 1` and halve the interval about 25 times. It is short, exact for any RGB space, and fast at Pond's scale (a few hundred colors per theme change).
2. **Ottosson's analytic cusp.** Closed form for sRGB ([gamut clipping](https://bottosson.github.io/posts/gamutclipping/)). P3 would need refitted coefficients.
3. **EdgeSeeker table.** The spec's lookup table of cusp and curvature per hue ([CSS Color 4 §14.2.3](https://www.w3.org/TR/css-color-4/#GMA-EdgeSeeker)). Fastest, but it adds a table per gamut.

Measured ceilings, sRGB and then P3:

| Hue | L 0.575 | L 0.97 |
| --- | --- | --- |
| 25 (red) | 0.233 / 0.263 | 0.015 / 0.019 |
| 100 (yellow) | 0.120 / 0.138 | 0.066 / 0.076 |
| 150 (green) | 0.158 / 0.221 | 0.048 / 0.054 |
| 250 (blue) | 0.163 / 0.210 | 0.015 / 0.016 |

Once Pond maps colors itself, the binary search with local MINDE from the spec, or plain constant-L chroma reduction, gives near-identical results for UI colors. The local-MINDE refinement matters most for light yellows and cyans, where pure chroma reduction over-desaturates ([CSS Color 4 §14.1.4](https://www.w3.org/TR/css-color-4/#GM-excessive-reduction), [Color.js gamut mapping](https://colorjs.io/docs/gamut-mapping)).

### 5.4 Replacing the 1.4x P3 boost

Use relative chroma, Okhsl's saturation idea ([Okhsv and Okhsl](https://bottosson.github.io/posts/colorpicker/)), instead of a flat multiplier:

```ts
/** Keeps a color's position relative to the gamut edge when moving from sRGB to P3. */
function widenToP3({ l, c, h }: Oklch): Oklch {
  const relative = c / cMax(l, h, "srgb");
  return { l, c: Math.min(relative, 1) * cMax(l, h, "p3"), h };
}
```

An sRGB-edge accent lands on the P3 edge, a muted accent stays muted, and nothing leaves the gamut.

## 6. Recommendation for Pond

### 6.1 Direction

Replace runtime `color-mix` curves with one pure TypeScript function, `buildThemeTokens(def, gamut)`, in `@pond/schema` next to `themeCssVars`. It should:

1. Interpolate neutrals along a straight OKLab line from bg to fg. That removes hue sweep by construction.
2. Solve each step's position for a WCAG 2 ratio target from a per-mode table. The slider moves targets the way Material's contrast curves do.
3. Build accent and hue ramps with the same solver: hue and chroma from the seed, lightness from the target, chroma capped at `Cmax` for the display gamut.
4. Derive `--ds-accent-contrast` and solve alpha tokens against `--ds-gray-1`.
5. Emit only in-gamut colors, so Chromium's clipping never triggers.

This combines Material's role-based contrast curves, Leonardo's ratio solving, Radix's 12-step semantics, step 9 equal to the user accent, and its text rule, plus CSS Color 4 chroma reduction.

### 6.2 JavaScript at apply time vs CSS `color-mix`

| Concern | CSS `color-mix` today | JS at apply time |
| --- | --- | --- |
| Contrast targets | cannot solve | bisection for each step |
| Gamut | browser clips | `Cmax` per color |
| Hue sweep | needs `none` hue or `in oklab` | straight OKLab line |
| Testability | needs a browser | plain Vitest |
| CSS-only consumers (website, scoped overrides) | works | needs static blocks emitted at build time |
| Cost | per-style-resolve, small | about 250 colors × 25 iterations per theme change (estimate, measure it) |

Keep `color-mix` only for one-off component tints, and switch those 27 sites to `in oklab`.

### 6.3 Proposed algorithm

```ts
type Gamut = "srgb" | "p3";
type Mode = "light" | "dark";

/** Values at contrast levels -1, 0, 0.5, 1, as in Material's ContrastCurve. */
type Curve = readonly [low: number, normal: number, medium: number, high: number];

interface ScaleSpec {
  /** WCAG 2 ratio against gray-1 for steps 2 to 10; index 0 is step 2. */
  steps: readonly Curve[];
  /** WCAG 2 ratio against gray-2 for step 11. */
  text11: Curve;
  /** Hard floors that hold at every level. */
  floors: { text11: number; text12: number; border8: number };
}

function levelFromSlider(contrast: number): number {
  return (clamp(contrast, 0, 100) - 50) / 50;
}

export function buildThemeTokens(def: ThemeDef, gamut: Gamut): Record<string, string> {
  const level = levelFromSlider(def.contrast);
  const bg = hexToOklab(def.background);
  const fg = hexToOklab(def.foreground);
  const mode: Mode = luminance(bg) < luminance(fg) ? "dark" : "light";
  const spec = SPECS[mode];

  const along = (t: number) => lerpOklab(bg, fg, t);
  const gray: Oklab[] = Array(12);
  gray[0] = bg;
  gray[11] = fg;
  for (let step = 2; step <= 10; step++) {
    const target = curveAt(spec.steps[step - 2], level);
    gray[step - 1] = along(solveT((t) => wcag(along(t), bg), target));
  }
  const text11 = Math.max(spec.floors.text11, curveAt(spec.text11, level));
  gray[10] = along(solveT((t) => wcag(along(t), gray[1]), text11));

  const accentSeed = toGamut(widen(hexToOklch(def.accent), gamut), gamut);
  const accent = scaleFromSeed(accentSeed, { gray, spec, level, gamut, keepStep9: true });
  const hues = mapValues(HUE_SEEDS, (seed) =>
    scaleFromSeed(seed, { gray, spec, level, gamut, keepStep9: false }),
  );

  return {
    ...emitScale("gray", gray, gamut),
    ...emitAlpha("gray", gray, bg, fg, gamut),
    ...emitScale("accent", accent, gamut),
    ...emitAlpha("accent", accent, bg, accentSeed, gamut),
    "--ds-accent-contrast": emit(onColor(accent[8], mode), gamut),
    ...flatMap(hues, (scale, name) => emitScale(name, scale, gamut)),
  };
}

/** Steps 1 to 8 track the gray step's contrast; 9 and 10 are solids; 11 and 12 are text. */
function scaleFromSeed(seed: Oklch, ctx: ScaleContext): Oklch[] {
  const { gray, spec, level, gamut } = ctx;
  const out: Oklch[] = Array(12);
  for (let step = 1; step <= 8; step++) {
    const ratio = wcag(gray[step - 1], gray[0]);
    const l = solveL(seed.h, seed.c * TINT_CHROMA[step], ratio, gray[0], gamut);
    out[step - 1] = capChroma({ l, c: seed.c * TINT_CHROMA[step], h: seed.h }, gamut);
  }
  out[8] = ctx.keepStep9 ? seed : solidForHue(seed, gamut);
  out[9] = hover(out[8]);
  const textChroma = Math.max(out[7].c, out[8].c);
  const text11 = Math.max(spec.floors.text11, curveAt(spec.text11, level));
  out[10] = capChroma(solveLText(seed.h, textChroma, text11, gray[1], gamut), gamut);
  out[11] = capChroma(solveLText(seed.h, textChroma, spec.floors.text12, gray[1], gamut), gamut);
  return out;
}

/** WCAG gate first; prefer white when both pass. */
function onColor(solid: Oklch, mode: Mode): Oklch {
  const white = WHITE;
  const ink = { l: 0.25, c: Math.max(0.08 * solid.c, 0.04), h: solid.h };
  const whiteRatio = wcag(white, solid);
  const inkRatio = wcag(ink, solid);
  if (whiteRatio >= 4.5) return white;
  if (inkRatio >= 4.5) return ink;
  return whiteRatio >= inkRatio ? white : ink;
}

/** Radix's step-10 hover rule. */
function hover({ l, c, h }: Oklch): Oklch {
  return l > 0.4 ? { l: l - 0.03 / (l + 0.1), c: c * 0.93, h } : { l: l + 0.03 / (l + 0.1), c, h };
}
```

Notes on the pieces:

- **`solveT` and `solveL`:** bisection over `[0, 1]` or `[0, 1]` lightness. Lightness is linear in `t` along an OKLab line, and luminance is monotonic in L at fixed hue and modest chroma, so bisection converges. If a target cannot be reached, for example when the user's fg is too close to bg, return the endpoint and add the token to an `unmet` list that Settings can show.
- **`solidForHue`:** for hue ramps only. Put step 9 near the hue's cusp lightness, clamped to about [0.55, 0.85], so yellow-9 stays bright with dark text and blue-9 stays deep with white text. That matches Radix's documented step-9 text pairing and Tailwind's per-hue lightness. The accent keeps the user's exact color.
- **`TINT_CHROMA`:** starts from today's `CHROMA_SCALE`. Chroma is always capped at `Cmax`, never a fixed multiple.
- **`emitAlpha`:** port Radix's `getAlphaColor` (MIT). Solve per 8-bit channel against `--ds-gray-1`. Like Radix, overlay black when the step is darker than the background and white when it is lighter. For P3, Radix solves with 1/1000 alpha precision.
- **Output format:** sRGB gamut emits `#rrggbb`. P3 emits `oklch()` values verified inside P3. Every color is in gamut, so browser clipping is a no-op.
- **Starting targets:** take them from today's output at slider 50 so the default look does not move. Default light, ratio against `--ds-gray-1` for steps 2 to 11: `1.07 1.15 1.26 1.42 1.70 2.10 2.79 4.02 6.36 10.77`. Default dark: `1.03 1.08 1.16 1.30 1.57 2.03 2.86 4.31 6.76 10.75`. Those become the `normal` column. Design then tunes the `low`, `medium`, and `high` columns. Suggested floors are 4.5:1 for step 11 on step 2, 7:1 for step 12 on step 2, and 3:1 for step 8 on step 1 at the `high` level.

### 6.4 How the contrast slider should map to targets

- Map 0 to 100 to level -1 to 1, with 50 as level 0, which reproduces today's look ([Material ContrastCurve](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/dynamiccolor/contrast_curve.ts)).
- Every step's ratio against `--ds-gray-1` must be non-decreasing in level. That fixes the inverted behavior in section 2, claim 3.
- If design wants one knob instead of four columns, Leonardo's `(r - 1) * k + 1` with `k = 2 ** level` stretches every step proportionally ([utils.js](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/lib/utils.js)). Clamp step 12 to the user's fg.
- Floors apply after the curve, so the low end never drops text below 4.5:1 (open question 1).

### 6.5 Keeping token names

| Token | Today | Proposed |
| --- | --- | --- |
| `--ds-gray-1..12` | oklch mix | solved values; gray-1 is bg, gray-12 is fg |
| `--ds-gray-a1..12` | fg at the same percentage | Radix-style solved alpha |
| `--ds-accent-1..12` | oklab mix with gray | `scaleFromSeed(accent)`; 9 is the user accent, in gamut |
| `--ds-accent-a1..12` | accent at fixed alphas | solved alpha |
| `--ds-accent-contrast` | none | new, replaces `color: var(--ds-gray-1)` in the `accent` Button |
| `--ds-{hue}-1..12` | static, light only | theme-aware, from the same function |
| `--ds-bg`, `--ds-fg`, `--ds-accent-solid`, `--ds-*-l/c/h`, `--ds-contrast` | anchors | keep for CSS-only consumers and the shell hint |
| `--ds-gray-surface`, `--ds-gray-indicator`, `--ds-gray-track`, `--ds-border-subtle` | mixes | keep; switch the mixes to `in oklab` |

`gen.ts` keeps producing `palette.css` and `scale.css`, but writes literal values from `buildThemeTokens(DEFAULT_LIGHT_THEME)` and `DEFAULT_DARK_THEME` under `:root` and `[data-theme="dark"]`. CSS-only pages and pre-JS paint keep working.

### 6.6 Libraries

| Library | License | Size (full import, bundlephobia) | Fit |
| --- | --- | --- | --- |
| [culori](https://culorijs.org/api/) 4.0.2 | MIT | 62.2 kB min, 22.2 kB gzip; tree-shakeable `culori/fn` | Has `toGamut` (CSS local-MINDE variant, JND 0.02), `clampChroma`, `wcagContrast`. Good test oracle. |
| [colorjs.io](https://colorjs.io/docs/gamut-mapping) 0.7.1 | MIT | 81.7 kB min, 32.4 kB gzip | CSS `toGamut` by default, `deltaEOK`, APCA. Used by Radix's generator. |
| [material-color-utilities](https://github.com/material-foundation/material-color-utilities) 0.4.0 | Apache-2.0 | not measured reliably | HCT tones, not OKLCH. Reference for the contrast-curve design, not a dependency. |
| [apca-w3](https://github.com/Myndex/apca-w3) 0.1.9 | "Limited W3 License" (npm), AGPL v3 for other uses | not measured | See section 4. Do not ship without review. |
| [@adobe/leonardo-contrast-colors](https://github.com/adobe/leonardo) 1.1.0 | Apache-2.0 | not measured | Depends on `apca-w3`, `chroma-js`, `hsluv`, `ciecam02`. |
| apcach 0.6.4 | MIT | not measured | Depends on `apca-w3`. |

**Verdict:** implement in-house. Pond already has the forward Oklab transform. The rest is about 200 to 300 lines: the inverse transform, the sRGB and P3 matrices, WCAG luminance, two bisection solvers, `cMax`, and a Radix alpha port. That keeps 20 to 30 kB gzip out of the boot path and avoids license questions. Add `culori` as a `devDependency` to cross-check conversions and gamut mapping on random colors in tests.

### 6.7 Migration risk

- **Visual drift.** Calibrating to today's slider-50 output limits gray drift. Accent steps 3 to 8 become lighter tints, because they now match gray contrast instead of mixing 32% to 96% accent. Accent-11 darkens to pass 4.5:1. Hue ramps change in dark mode, which is the intent. Produce a before and after ΔEOK report per token per preset for design review.
- **Accent button text.** On light presets the text flips to dark ink, unless design adjusts accent-9 for fills (open question 2).
- **Slider meaning.** Stored values stay 0 to 100, but 0 and 100 render differently than today. Contrast 100 restores visible hover and selected states.
- **Boot and first paint.** `boot-shell.ts` replays persisted anchors today. Either persist the computed token map in the shell hint (about 300 entries) or import `buildThemeTokens` into the boot bundle and recompute. Recompute avoids stale caches. The boot output must match the applier's, or the theme flashes on load.
- **Write path.** About 300 `setProperty` calls per theme change, or one constructed stylesheet. Check that a constructed stylesheet is allowed under the packaged CSP before switching. `setProperty` already works.
- **CSS-only consumers.** The website ([`globals.css`](../../apps/website/app/globals.css)) and the gallery dialog override anchors in CSS. Give them generated static blocks, or keep a legacy `color-mix` block switched to `in oklab` with `none` hues.
- **Low-risk interim fixes** that can ship separately: emit `none` for hue when chroma is below the OKLCH ε of `0.000004` ([CSS Color 4 §9.4](https://www.w3.org/TR/css-color-4/#specifying-oklab-oklch)); switch gray mixes to `in oklab`; add `--ds-accent-contrast`; generate dark hue ramps; gamut-map the static ramps in `gen.ts`.

### 6.8 Verification plan

Vitest in `@pond/schema`, offline, run for every preset × contrast `{0, 25, 50, 75, 100}` × gamut `{srgb, p3}`:

1. `wcag(gray-12, gray-2) >= 7`. If a preset's own fg and bg cannot reach this, fix the preset.
2. `wcag(gray-11, gray-1) >= 4.5` and `wcag(gray-11, gray-2) >= 4.5`.
3. `wcag(accent-11, gray-2) >= 4.5`. Same for `red-11`, `orange-11`, `green-11`, and `yellow-11` in both modes.
4. `wcag(accent-contrast, accent-9) >= 4.5`, or the preset is listed as a known exception with a reason.
5. `wcag(gray-8, gray-1) >= 3` at contrast 100.
6. Ratio against gray-1 rises strictly from step 1 to 12, and for each step it is non-decreasing in contrast. This blocks a regression to the inverted slider.
7. Steps 2 to 5 are pairwise at least ΔEOK 0.01 apart at every contrast value.
8. Every emitted color is inside the target gamut, with linear channels in `[-1e-5, 1 + 1e-5]`.
9. Grays lie on the bg to fg OKLab segment, within ΔEOK `1e-6`.
10. The 8-bit composite of `gray-aN` over `gray-1` lands within one 8-bit step per channel of `gray-N`.
11. Conversions and `cMax` agree with `culori` on 10,000 random colors.
12. A snapshot of the default light and dark tokens, reviewed on change.

Runtime checks, in the existing development runtime and without starting a new one (per [AGENTS.md](../../AGENTS.md)): run the canvas readback from section 5.2 on Chrome 152 inside Pond, then compare screenshots of Settings > Appearance across presets on a P3 display and an sRGB display.

## 7. Open questions

1. **Floors.** Must every text token (gray-11, accent-11, status 11) meet 4.5:1 even at contrast 0, or can the low end trade legibility for softness?
2. **Accent button text.** WCAG 2 picks dark text for 28 of 30 presets; Radix's APCA rule picks white for 28 of 30. Keep white and darken the accent-9 fill in light mode (Material's approach moves tones to 49 for light text)? Switch to dark ink? Or accept 3:1 large-text compliance for buttons?
3. **User colors.** Should Pond adjust a user's fg or accent to meet targets, or keep them exact and warn in Settings?
4. **APCA.** Does the team want a license review of `apca-w3` for an MIT desktop app, even for test-only use? Until then, WCAG 2 only.
5. **Slider top end.** Should contrast 100 meet WCAG AAA (7:1) for gray-11?
6. **Hue ramps.** Should status colors follow a tinted custom background at runtime, or come from fixed light and dark sets built at build time?
7. **Step 9 of hue ramps.** Per-hue cusp lightness (Radix and Tailwind: bright yellow, dark text) or contrast-equalized (Harmonizer: every step 9 the same contrast)?
8. **Translucent surfaces.** For vibrancy and translucent surfaces (`--ds-gray-surface`), which background should the tests validate text against?
9. **Website.** Should the website consume generated static blocks, or keep its own CSS-only anchor pipeline?
