// Generates a "lens" displacement + specular map for the liquid-glass filters.
//
// Unlike fractal noise (a watery, frosted ripple), a real glass lens bends light
// most at its *curved rim* and leaves the center clear, and it *magnifies* —
// content converges inward through a convex bezel. We encode that as a map of a
// rounded rectangle:
//   R/G  → inward displacement (feDisplacementMap reads R→x, G→y). Pointing
//          inward makes the rim converge → magnify, like a real lens.
//   B    → a specular highlight baked from the surface normal and a fixed
//          top-left light, lifted back into a bright rim glint by the filter.
// The bend ramps up across a bevel band with a smoothstep falloff (no harsh
// arc/flat inflection) and stays neutral (0.5, 0.5 / 0) everywhere else.
//
// Normalized + stretched onto any surface, so one map serves bars, pills, and
// popups of any size.

export interface LensMapOptions {
  // Resolution of the (square) map. 256 is plenty; it gets stretched anyway.
  size?: number;
  // Corner radius as a fraction of the half-extent. 1 = fully rounded (stadium/
  // pill), ~0.2 = gently rounded card.
  radius: number;
  // Width of the refracting bezel band as a fraction of the half-extent. Larger
  // = the bend reaches further toward the center.
  bezel?: number;
  // Shapes the bend falloff across the bezel. >1 concentrates it at the very
  // rim (sharper, more "glassy"); <1 spreads it inward.
  curvature?: number;
  // Tightness of the specular glint. Higher = a smaller, crisper highlight.
  shininess?: number;
  // Neutral margin baked around the shape (fraction of size). Guarantees the
  // map is non-displacing at the surface boundary, so the filter never samples
  // past its region and leaves no dark edge fringe.
  inset?: number;
}

function roundedRectSdf(
  px: number,
  py: number,
  half: number,
  radius: number,
): number {
  const qx = Math.abs(px) - (half - radius);
  const qy = Math.abs(py) - (half - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Fixed virtual light, shared by every glass surface so highlights stay
// consistent: top-left, slightly toward the viewer. (Screen space: +x right,
// +y down, +z toward viewer.) Half-vector with the head-on view direction.
const LIGHT = (() => {
  const lx = -0.55;
  const ly = -0.55;
  const lz = 0.63;
  // Half vector H = normalize(L + V), V = (0, 0, 1).
  let hx = lx;
  let hy = ly;
  let hz = lz + 1;
  const len = Math.hypot(hx, hy, hz) || 1;
  hx /= len;
  hy /= len;
  hz /= len;
  return { hx, hy, hz };
})();

// Memoize by option signature so repeated mounts reuse one data URL.
const cache = new Map<string, string>();

export function generateLensMap(options: LensMapOptions): string {
  const {
    size = 256,
    radius,
    bezel = 0.22,
    curvature = 1.4,
    shininess = 5,
    inset = 0.08,
  } = options;

  const key = `${size}:${radius}:${bezel}:${curvature}:${shininess}:${inset}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Guard for any non-DOM context (SSR, tests); callers fall back to plain blur.
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const image = ctx.createImageData(size, size);
  const data = image.data;

  const center = size / 2;
  const half = center - inset * size;
  const cornerRadius = Math.max(0, Math.min(1, radius)) * half;
  const band = Math.max(1, bezel * half);

  const sdfAt = (x: number, y: number) =>
    roundedRectSdf(x - center, y - center, half, cornerRadius);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const d = sdfAt(x, y);

      // Default: neutral, no displacement, no highlight.
      let r = 0.5;
      let g = 0.5;
      let b = 0;

      // Only the interior bezel band bends; the clear center and the outside
      // margin stay neutral.
      const depth = -d; // positive inside the shape
      if (depth >= 0 && depth < band) {
        // 1 at the rim, smoothly to 0 a band-width inside.
        const ramp = 1 - smoothstep(0, band, depth);
        const magnitude = ramp ** curvature;

        // Outward normal = gradient of the SDF (points away from interior).
        const gx = sdfAt(x + 1, y) - sdfAt(x - 1, y);
        const gy = sdfAt(x, y + 1) - sdfAt(x, y - 1);
        const len = Math.hypot(gx, gy) || 1;
        const outX = gx / len;
        const outY = gy / len;

        // Displace *inward* (negate the outward normal) so the convex rim
        // converges rays and magnifies, like a real lens.
        r = 0.5 - 0.5 * outX * magnitude;
        g = 0.5 - 0.5 * outY * magnitude;

        // Specular: build the tilted surface normal in the bevel and glint it
        // against the fixed light. Gated by the bevel so the flat center stays
        // dark — the highlight only rides the rim.
        let nx = outX * magnitude;
        let ny = outY * magnitude;
        let nz = 1 - 0.5 * magnitude;
        const nlen = Math.hypot(nx, ny, nz) || 1;
        nx /= nlen;
        ny /= nlen;
        nz /= nlen;
        const ndoth = Math.max(
          nx * LIGHT.hx + ny * LIGHT.hy + nz * LIGHT.hz,
          0,
        );
        b = ndoth ** shininess * magnitude;
      }

      data[idx] = Math.round(r * 255);
      data[idx + 1] = Math.round(g * 255);
      data[idx + 2] = Math.round(Math.min(1, b) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
