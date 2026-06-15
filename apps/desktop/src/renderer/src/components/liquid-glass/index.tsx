// Procedural "liquid glass" refraction filter, shared by any in-app glass
// surface. Unlike a baked PNG displacement map it is resolution- and
// size-independent: feTurbulence generates the distortion field, so one filter
// works for popups, modals, and bars of any dimension.
//
// Referenced from CSS via `backdrop-filter: url(#pond-liquid-glass) ...`, which
// warps the *content behind* the surface (not its own text). This only takes
// effect in Chromium — which is exactly what Electron renders in — and degrades
// to a plain blur elsewhere.
export const LIQUID_GLASS_FILTER_ID = "pond-liquid-glass";

export function LiquidGlassFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        <filter
          id={LIQUID_GLASS_FILTER_ID}
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.013"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2.2" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
