import {
  type Prefs,
  resolveActiveTheme,
  themeEngineVars,
} from "@pond/schema/db";
import { useEffect } from "react";
import { usePrefs } from "@/pool/prefs";

// Shadowed in localStorage so the inline boot script in index.html can
// restore the right theme before the bundle parses, killing the FOUC. Read
// by `<script>` in apps/desktop/src/renderer/index.html.
const SHELL_KEY = "pondShell";

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
    // localStorage can throw in private modes; the shell still works,
    // it just won't remember across launches.
  }
}

export function ThemeApplier() {
  const [prefs] = usePrefs("preferences");

  useEffect(() => {
    const root = document.documentElement;

    const apply = (prefersDark: boolean) => {
      const def = resolveActiveTheme(
        { preferences: prefs } as Prefs,
        prefersDark,
      );
      const v = themeEngineVars(def);
      root.style.setProperty("--ds-base-l", String(v.baseL));
      root.style.setProperty("--ds-base-c", String(v.baseC));
      root.style.setProperty("--ds-base-h", String(v.baseH));
      root.style.setProperty("--ds-accent-l", String(v.accentL));
      root.style.setProperty("--ds-accent-c", String(v.accentC));
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
        accentC: v.accentC,
        accentH: v.accentH,
        contrast: v.contrast,
        fgDir: v.fgDir,
      });
    };

    if (prefs.themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const sync = () => apply(mq.matches);
      sync();
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }

    apply(false);
  }, [
    prefs.themeMode,
    prefs.presetId,
    prefs.systemLightId,
    prefs.systemDarkId,
    prefs.custom,
    prefs,
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
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [prefs.reduceMotion]);

  return null;
}
