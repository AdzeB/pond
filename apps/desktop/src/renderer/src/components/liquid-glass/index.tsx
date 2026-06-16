// Procedural "liquid glass" refraction filters, shared by any in-app glass
// surface. Mounted once at the app root; referenced from CSS via
// `backdrop-filter: url(#pond-glass-…)`, which warps the *content behind* the
// surface (not its own text). Chromium-only — exactly what Electron renders —
// and degrades to a plain blur elsewhere.
//
// The shape comes from a generated rounded-rectangle lens map (see
// `lens-map.ts`): the bend concentrates at the rim and the center stays clear,
// which is what reads as real glass rather than frosted noise. Each filter runs
// the displacement three times at slightly different strengths (R/G/B) to add a
// faint chromatic fringe at the edges, the way light splits through glass.
import { usePrefs } from "@/stores/prefs";
import { generateLensMap, type LensMapOptions } from "./lens-map";

export { Glass, type GlassVariant } from "./glass";

interface GlassFilter {
  id: string;
  // Refraction strength (how far the rim bends the backdrop). In the filter's
  // primitive units: pixels for pills, a *fraction of the element size* for
  // cards (see `relative`).
  scale: number;
  // Per-channel spread for the chromatic fringe, in the same units as `scale`.
  chroma: number;
  // Intensity of the specular rim glint (0 = none).
  specular: number;
  // Blur radius of the specular glint pass, in the filter's primitive units.
  specularBlur: number;
  // When true the filter runs in `objectBoundingBox` units, so `scale`/`chroma`
  // are fractions of the element's own size rather than fixed pixels. This is
  // what keeps a small menu and a tall panel refracting at the same *visual*
  // intensity — the technique Aave use for their whole glass family.
  relative?: boolean;
  map: LensMapOptions;
}

// Fully-rounded surfaces: dock, pills, toolbar controls, media buttons.
export const GLASS_PILL_FILTER_ID = "pond-glass-pill";
// Gently-rounded surfaces: popups, menus, cards.
export const GLASS_CARD_FILTER_ID = "pond-glass-card";

// Defaults mirror the prefs schema; used until prefs load.
const DEFAULT_REFRACTION = 14;
const DEFAULT_CHROMA = 3;
// Specular glint strength, scaled by the enabled state.
const SPECULAR = 0.6;

// Pills are all small chrome (~32–44px), so a fixed *pixel* bend reads
// consistently across them. Cards are large and vary in size, where a fixed
// pixel bend barely registers — so the card filter runs in size-relative units
// and converts the shared px refraction slider into a *fraction of the element*
// with this factor (refraction 14 → ~0.10 of the surface, in Aave's range).
const CARD_RELATIVE = 0.007;
// Specular blur, per filter: pixels for pills, a size fraction for the card.
const PILL_SPECULAR_BLUR = 0.6;
const CARD_SPECULAR_BLUR = 0.004;

function buildFilters(
  refraction: number,
  chroma: number,
  specular: number,
): GlassFilter[] {
  return [
    {
      id: GLASS_PILL_FILTER_ID,
      scale: refraction,
      chroma,
      specular,
      specularBlur: PILL_SPECULAR_BLUR,
      map: { radius: 1, bezel: 0.5, curvature: 1.4, shininess: 4 },
    },
    {
      id: GLASS_CARD_FILTER_ID,
      relative: true,
      scale: refraction * CARD_RELATIVE,
      chroma: chroma * CARD_RELATIVE,
      specular,
      specularBlur: CARD_SPECULAR_BLUR,
      map: { radius: 0.22, bezel: 0.16, curvature: 2, shininess: 6 },
    },
  ];
}

// Keep only one channel of a displacement pass so the three can be screened
// back together into a chromatically-split result.
const CHANNEL_MATRIX: Record<"r" | "g" | "b", string> = {
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
};

// Lift the map's blue channel (baked specular) into a premultiplied white
// glint scaled by `s`; alpha 1 so it screen-blends cleanly (s=0 → black → no-op).
function specularMatrix(s: number): string {
  return `0 0 ${s} 0 0  0 0 ${s} 0 0  0 0 ${s} 0 0  0 0 0 0 1`;
}

function GlassFilterDef({ filter }: { filter: GlassFilter }) {
  const mapUrl = generateLensMap(filter.map);
  if (!mapUrl) return null;

  const { scale, chroma, specular } = filter;
  const hasSpecular = specular > 0;

  return (
    <filter
      id={filter.id}
      x="0"
      y="0"
      width="100%"
      height="100%"
      colorInterpolationFilters="sRGB"
      primitiveUnits={filter.relative ? "objectBoundingBox" : "userSpaceOnUse"}
    >
      <feImage
        href={mapUrl}
        preserveAspectRatio="none"
        x="0"
        y="0"
        width="100%"
        height="100%"
        result="map"
      />
      {/* Blue refracts more than red (higher effective IOR), so it gets the
          larger displacement — that ordering is what tints the fringe like real
          glass dispersion. */}
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale - chroma}
        xChannelSelector="R"
        yChannelSelector="G"
        result="dispR"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="dispG"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale + chroma}
        xChannelSelector="R"
        yChannelSelector="G"
        result="dispB"
      />
      <feColorMatrix
        in="dispR"
        type="matrix"
        values={CHANNEL_MATRIX.r}
        result="onlyR"
      />
      <feColorMatrix
        in="dispG"
        type="matrix"
        values={CHANNEL_MATRIX.g}
        result="onlyG"
      />
      <feColorMatrix
        in="dispB"
        type="matrix"
        values={CHANNEL_MATRIX.b}
        result="onlyB"
      />
      <feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
      <feBlend
        in="rg"
        in2="onlyB"
        mode="screen"
        result={hasSpecular ? "refracted" : undefined}
      />
      {hasSpecular ? (
        <>
          <feColorMatrix
            in="map"
            type="matrix"
            values={specularMatrix(specular)}
            result="glint"
          />
          <feGaussianBlur
            in="glint"
            stdDeviation={filter.specularBlur}
            result="glintSoft"
          />
          <feBlend in="refracted" in2="glintSoft" mode="screen" />
        </>
      ) : null}
    </filter>
  );
}

export function LiquidGlassFilters() {
  const [prefs] = usePrefs("preferences");

  // When liquid glass is off, the filters stay mounted (CSS still references
  // them) but become identity transforms — surfaces keep their blur, just lose
  // the refraction.
  const enabled = prefs.liquidGlass ?? true;
  const refraction = enabled
    ? (prefs.liquidGlassRefraction ?? DEFAULT_REFRACTION)
    : 0;
  const chroma = enabled ? (prefs.liquidGlassChroma ?? DEFAULT_CHROMA) : 0;
  const specular = enabled ? SPECULAR : 0;
  const filters = buildFilters(refraction, chroma, specular);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        {filters.map((filter) => (
          <GlassFilterDef key={filter.id} filter={filter} />
        ))}
      </defs>
    </svg>
  );
}
