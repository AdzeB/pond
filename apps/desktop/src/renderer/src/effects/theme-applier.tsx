import {
  P3_CHROMA_BOOST,
  type Prefs,
  resolveActiveTheme,
  themeEngineVars,
} from "@pond/schema/db";
import { useEffect } from "react";
import { useMediaMatch } from "rooks";
import { pondScopedKey } from "@/lib/pond-scope";
import { usePrefs } from "@/stores/prefs";

// Shadowed in localStorage so the index.html boot script can restore the theme
// before the bundle parses (kills FOUC). Keyed per pond: appearance is a pond
// pref, so the mirror must not leak the previous library's theme.
const SHELL_KEY = pondScopedKey("pondShell");

interface ShellPatch {
  theme?: "light" | "dark";
  baseL?: number;
  baseC?: number;
  baseH?: number;
  accentL?: number;
  accentC?: number;
  accentH?: number;
  contrast?: number;
  fgDir?: number;
  pointerCursors?: boolean;
}

function persistShell(patch: ShellPatch) {
  try {
    const raw = localStorage.getItem(SHELL_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(SHELL_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    // localStorage can throw in private modes; the shell just won't remember across launches.
  }
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

    const apply = (prefersDark: boolean) => {
      const def = resolveActiveTheme(
        { preferences: prefs } as Prefs,
        prefersDark,
      );
      const v = themeEngineVars(def);
      // Match the static ramps' P3 tier: boost accent chroma on wide-gamut displays.
      const accentC = prefersP3 ? v.accentC * P3_CHROMA_BOOST : v.accentC;
      root.style.setProperty("--ds-base-l", String(v.baseL));
      root.style.setProperty("--ds-base-c", String(v.baseC));
      root.style.setProperty("--ds-base-h", String(v.baseH));
      root.style.setProperty("--ds-accent-l", String(v.accentL));
      root.style.setProperty("--ds-accent-c", String(accentC));
      root.style.setProperty("--ds-accent-h", String(v.accentH));
      root.style.setProperty("--ds-contrast", String(v.contrast));
      root.style.setProperty("--ds-fg-dir", String(v.fgDir));

      const theme = v.isDark ? "dark" : "light";
      root.setAttribute("data-theme", theme);
      root.classList.toggle("dark", v.isDark);
      root.classList.toggle("light", !v.isDark);

      persistShell({
        theme,
        baseL: v.baseL,
        baseC: v.baseC,
        baseH: v.baseH,
        accentL: v.accentL,
        accentC,
        accentH: v.accentH,
        contrast: v.contrast,
        fgDir: v.fgDir,
      });
    };

    apply(prefs.themeMode === "system" ? prefersDark : false);
  }, [
    prefs.themeMode,
    prefs.presetId,
    prefs.systemLightId,
    prefs.systemDarkId,
    prefs.custom,
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
    if (prefs.reduceTransparency) {
      root.setAttribute("data-reduce-transparency", "true");
    } else {
      root.removeAttribute("data-reduce-transparency");
    }
  }, [prefs.reduceTransparency]);

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
