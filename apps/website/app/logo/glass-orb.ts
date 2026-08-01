/** WebGL2 glass orb: crafted mark texture + live refraction shimmer. */

export type GlassOrbUniforms = {
  /** Scale of the icon in the frame. */
  size: number;
  speed: number;
  /** Live refraction strength on the orb. */
  warp: number;
  shimmer: number;
  specular: number;
  fresnel: number;
  background: [number, number, number];
};

export type GlassOrbRenderer = {
  setUniforms: (next: GlassOrbUniforms) => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSize;
uniform float uWarp;
uniform float uShimmer;
uniform float uSpecular;
uniform float uFresnel;
uniform vec3 uBackground;
uniform sampler2D uMark;

out vec4 fragColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    s += a * valueNoise(p);
    p = m * p * 2.02;
    a *= 0.5;
  }
  return s;
}

float squircleSd(vec2 p, float n) {
  vec2 a = abs(p);
  return pow(pow(a.x, n) + pow(a.y, n), 1.0 / n);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float minAxis = min(uResolution.x, uResolution.y);
  vec2 uv = (frag - 0.5 * uResolution) / minAxis;

  float halfSize = max(uSize, 0.15);
  vec2 local = uv / halfSize;
  float sd = squircleSd(local, 5.0) - 1.0;
  float iconMask = 1.0 - smoothstep(0.0, fwidth(sd) * 1.4, sd);

  /** Texture UVs over the icon tile. */
  vec2 texUv = local * 0.5 + 0.5;

  /** Orb disc roughly centered in the craft mark. */
  vec2 orbQ = (local) / 0.58;
  float orbR = length(orbQ);
  float z = sqrt(max(0.0, 1.0 - min(orbR * orbR, 1.0)));
  vec3 N = normalize(vec3(orbQ, max(z, 1e-3)));
  float orbMask = 1.0 - smoothstep(1.0 - fwidth(orbR) * 1.4, 1.0, orbR);
  orbMask *= iconMask;

  float t = uTime;
  vec2 sampleUv = texUv;

  if (uWarp > 0.001) {
    vec2 flow = vec2(
      fbm(local * 2.0 + vec2(0.0, t * 0.07)) - 0.5,
      fbm(local * 2.0 + vec2(3.8, -t * 0.06)) - 0.5
    );
    sampleUv += flow * uWarp * 0.028 * orbMask;
    sampleUv += N.xy * uWarp * 0.01 * orbMask;
  }

  sampleUv = clamp(sampleUv, 0.001, 0.999);
  vec3 col = texture(uMark, vec2(sampleUv.x, 1.0 - sampleUv.y)).rgb;

  if (uShimmer > 0.001) {
    float n = fbm(orbQ * 2.8 + vec2(t * 0.09, 0.0));
    float spark = pow(max(0.0, n - 0.58), 3.2);
    col += vec3(0.65, 0.88, 1.0) * spark * uShimmer * 0.16 * orbMask;
  }

  vec2 aquaQ = (orbQ - vec2(-0.34, 0.46)) * vec2(1.2, 1.0);
  float aqua = exp(-dot(aquaQ, aquaQ) * 16.0) * orbMask;
  float glint = exp(-dot(orbQ - vec2(-0.28, 0.5), orbQ - vec2(-0.28, 0.5)) * 130.0) * orbMask;
  col += vec3(1.0) * aqua * uSpecular * 0.14;
  col += vec3(1.0) * glint * uSpecular * 0.18;

  float fres = pow(1.0 - z, 3.2) * orbMask;
  col += vec3(0.7, 0.88, 1.0) * fres * uFresnel * 0.1;
  col += vec3(1.0) * pow(1.0 - z, 12.0) * orbMask * uFresnel * 0.16;

  vec3 outCol = mix(uBackground, col, iconMask);
  fragColor = vec4(clamp(outCol, 0.0, 1.0), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

async function loadTexture(
  gl: WebGL2RenderingContext,
  url: string,
): Promise<WebGLTexture | null> {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([20, 20, 24, 255]),
  );

  const img = new Image();
  img.decoding = "async";
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
  });
  img.src = url;
  try {
    const bitmap = await loaded;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  } catch (err) {
    console.error(err);
  }
  return tex;
}

export function createGlassOrbRenderer(
  canvas: HTMLCanvasElement,
  markUrl = "/pond-glass-orb.png",
): GlassOrbRenderer | null {
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  if (!context) return null;
  const gl: WebGL2RenderingContext = context;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const vao = gl.createVertexArray();
  const loc = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    size: gl.getUniformLocation(program, "uSize"),
    warp: gl.getUniformLocation(program, "uWarp"),
    shimmer: gl.getUniformLocation(program, "uShimmer"),
    specular: gl.getUniformLocation(program, "uSpecular"),
    fresnel: gl.getUniformLocation(program, "uFresnel"),
    background: gl.getUniformLocation(program, "uBackground"),
    mark: gl.getUniformLocation(program, "uMark"),
  };

  let uniforms: GlassOrbUniforms = {
    size: 0.42,
    speed: 0.2,
    warp: 0.55,
    shimmer: 0.35,
    specular: 0.55,
    fresnel: 0.4,
    background: [0.04, 0.04, 0.05],
  };

  let frame = 0;
  let clock = 0;
  let last = performance.now();
  let texture: WebGLTexture | null = null;
  let disposed = false;

  void loadTexture(gl, markUrl).then((tex) => {
    if (disposed) {
      if (tex) gl.deleteTexture(tex);
      return;
    }
    texture = tex;
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function draw(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    clock += dt * uniforms.speed;

    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram, not a React hook.
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(loc.mark, 0);

    gl.uniform2f(loc.resolution, canvas.width, canvas.height);
    gl.uniform1f(loc.time, clock);
    gl.uniform1f(loc.size, uniforms.size);
    gl.uniform1f(loc.warp, uniforms.warp);
    gl.uniform1f(loc.shimmer, uniforms.shimmer);
    gl.uniform1f(loc.specular, uniforms.specular);
    gl.uniform1f(loc.fresnel, uniforms.fresnel);
    gl.uniform3fv(loc.background, uniforms.background);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frame = requestAnimationFrame(draw);
  }

  return {
    setUniforms(next) {
      uniforms = next;
    },
    start() {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);
      if (texture) gl.deleteTexture(texture);
    },
  };
}
