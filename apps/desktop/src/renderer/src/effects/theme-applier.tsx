import {
  P3_CHROMA_BOOST,
  type Prefs,
  resolveActiveTheme,
  themeCssVars,
} from "@pond/schema/db";
import { useEffect } from "react";
import { useMediaMatch } from "rooks";
import { pondScopedKey } from "@/lib/pond-scope";
import { usePrefs } from "@/stores/prefs";

const SHELL_KEY = pondScopedKey("pondShell");

interface ShellPatch {
  theme?: "light" | "dark";
  bgL?: number;
  bgC?: number;
  bgH?: number;
  fgL?: number;
  fgC?: number;
  fgH?: number;
  accentL?: number;
  accentC?: number;
  accentH?: number;
  contrast?: number;
  pointerCursors?: boolean;
}

function persistShell(patch: ShellPatch) {
  try {
    const raw = localStorage.getItem(SHELL_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(SHELL_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {}
}

export function ThemeApplier() {
  const [prefs] = usePrefs("preferences");
  const prefersDark = useMediaMatch("(prefers-color-scheme: dark)");
  const prefersP3 = useMediaMatch("(color-gamut: p3)");
  const prefersReducedMotion = useMediaMatch(
    "(prefers-reduced-motion: reduce)",
  );

  useEffect(() => {
    const root = document.documentElement;

    const def = resolveActiveTheme(
      { preferences: prefs } as Prefs,
      prefersDark,
    );
    const v = themeCssVars(def);
    const accentC = prefersP3 ? v.accentC * P3_CHROMA_BOOST : v.accentC;
    root.style.setProperty("--ds-bg-l", String(v.bgL));
    root.style.setProperty("--ds-bg-c", String(v.bgC));
    root.style.setProperty("--ds-bg-h", String(v.bgH));
    root.style.setProperty("--ds-fg-l", String(v.fgL));
    root.style.setProperty("--ds-fg-c", String(v.fgC));
    root.style.setProperty("--ds-fg-h", String(v.fgH));
    root.style.setProperty("--ds-accent-l", String(v.accentL));
    root.style.setProperty("--ds-accent-c", String(accentC));
    root.style.setProperty("--ds-accent-h", String(v.accentH));
    root.style.setProperty("--ds-contrast", String(v.contrast));

    const theme = v.isDark ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", v.isDark);
    root.classList.toggle("light", !v.isDark);

    persistShell({
      theme,
      bgL: v.bgL,
      bgC: v.bgC,
      bgH: v.bgH,
      fgL: v.fgL,
      fgC: v.fgC,
      fgH: v.fgH,
      accentL: v.accentL,
      accentC,
      accentH: v.accentH,
      contrast: v.contrast,
    });
  }, [
    prefs.appearance,
    prefs.light,
    prefs.dark,
    prefs,
    prefersDark,
    prefersP3,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.pointerCursors) {
      root.setAttribute("data-pointer-cursors", "true");
    } else {
      root.removeAttribute("data-pointer-cursors");
    }
    persistShell({ pointerCursors: prefs.pointerCursors });
  }, [prefs.pointerCursors]);

  useEffect(() => {
    const root = document.documentElement;
    const setReduce = (reduce: boolean) => {
      if (reduce) root.setAttribute("data-reduce-motion", "true");
      else root.removeAttribute("data-reduce-motion");
    };
    if (prefs.reduceMotion === "always") {
      setReduce(true);
      return;
    }
    if (prefs.reduceMotion === "never") {
      setReduce(false);
      return;
    }
    setReduce(prefersReducedMotion);
  }, [prefs.reduceMotion, prefersReducedMotion]);

  return null;
}
