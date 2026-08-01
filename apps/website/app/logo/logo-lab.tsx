"use client";

import { button, folder, Leva, useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  createGlassOrbRenderer,
  type GlassOrbRenderer,
  type GlassOrbUniforms,
} from "./glass-orb";
import styles from "./styles.module.css";

const LEVA_THEME = {
  colors: {
    elevation1: "#0d0d11",
    elevation2: "#141419",
    elevation3: "#1d1d24",
    accent1: "#3f6ea8",
    accent2: "#4f8ed6",
    accent3: "#6ba8f0",
    highlight1: "#8a8a99",
    highlight2: "#c9c9d4",
    highlight3: "#ffffff",
  },
  radii: { xs: "3px", sm: "6px", lg: "10px" },
  space: { sm: "7px", md: "10px", rowGap: "8px", colGap: "8px" },
  fontSizes: { root: "11.5px" },
};

function hexToRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(v)) return [0, 0, 0];
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function LogoLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GlassOrbRenderer | null>(null);
  const exportRef = useRef<() => void>(() => {});

  const controls = useControls({
    orb: folder({
      size: { value: 0.42, min: 0.2, max: 0.7, step: 0.005 },
      warp: { value: 0.55, min: 0, max: 2, step: 0.01 },
      shimmer: { value: 0.35, min: 0, max: 2, step: 0.01 },
      specular: { value: 0.55, min: 0, max: 2, step: 0.01 },
      fresnel: { value: 0.4, min: 0, max: 2, step: 0.01 },
    }),
    motion: folder({
      speed: { value: 0.2, min: 0, max: 1.2, step: 0.01 },
    }),
    background: "#0a0a0c",
    export: button(() => exportRef.current()),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createGlassOrbRenderer(canvas);
    if (!renderer) return;
    rendererRef.current = renderer;
    renderer.start();
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const uniforms: GlassOrbUniforms = {
      size: controls.size,
      speed: controls.speed,
      warp: controls.warp,
      shimmer: controls.shimmer,
      specular: controls.specular,
      fresnel: controls.fresnel,
      background: hexToRgb(controls.background),
    };
    rendererRef.current?.setUniforms(uniforms);
  }, [controls]);

  exportRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "pond-glass-orb.png";
    a.click();
  };

  return (
    <div className={styles.lab}>
      <Leva
        theme={LEVA_THEME}
        titleBar={{ title: "Glass orb", filter: false }}
        collapsed={false}
      />
      <canvas ref={canvasRef} className={styles.canvas} />
      <p className={styles.caption}>Pond glass orb</p>
    </div>
  );
}
