import { useEffect } from "react";
import { usePrefs } from "@/pool/prefs";

// Shadowed in localStorage so the inline boot script in index.html can
// restore the right theme/pointer style before the bundle parses, killing
// the FOUC. Read by `<script>` in apps/desktop/src/renderer/index.html.
const SHELL_KEY = "pondShell";

const RADIUS_ANCHOR = 14;

type ResolvedTheme = "light" | "dark" | "high-contrast";

function persistShell(patch: {
  theme?: ResolvedTheme;
  pointerCursors?: boolean;
  accentHue?: string;
  customHue?: number;
  neutralHue?: string;
  radius?: number;
  accentIntensity?: number;
}) {
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

    const apply = (resolved: ResolvedTheme) => {
      root.setAttribute("data-theme", resolved);
      root.classList.toggle("dark", resolved === "dark");
      root.classList.toggle("light", resolved === "light");
      root.classList.toggle("high-contrast", resolved === "high-contrast");
      persistShell({ theme: resolved });
    };

    if (prefs.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const sync = () => apply(mq.matches ? "dark" : "light");
      sync();
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }

    apply(prefs.theme);
  }, [prefs.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hue", prefs.accentHue);
    persistShell({ accentHue: prefs.accentHue });
  }, [prefs.accentHue]);

  useEffect(() => {
    const root = document.documentElement;
    const hue = Number.isFinite(prefs.customHue) ? prefs.customHue : 250;
    root.style.setProperty("--ds-custom-hue", String(hue));
    persistShell({ customHue: hue });
  }, [prefs.customHue]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-neutral", prefs.neutralHue);
    persistShell({ neutralHue: prefs.neutralHue });
  }, [prefs.neutralHue]);

  useEffect(() => {
    const root = document.documentElement;
    const radius = Number.isFinite(prefs.radius) ? prefs.radius : RADIUS_ANCHOR;
    root.style.setProperty("--radius-scale", String(radius / RADIUS_ANCHOR));
    persistShell({ radius });
  }, [prefs.radius]);

  useEffect(() => {
    const root = document.documentElement;
    const intensity = Number.isFinite(prefs.accentIntensity)
      ? prefs.accentIntensity
      : 100;
    root.style.setProperty("--ds-accent-saturation", `${intensity}%`);
    persistShell({ accentIntensity: intensity });
  }, [prefs.accentIntensity]);

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

  useEffect(() => {
    const root = document.documentElement;
    const ui = Number.isFinite(prefs.uiFontSize) ? prefs.uiFontSize : 13;
    const code = Number.isFinite(prefs.codeFontSize) ? prefs.codeFontSize : 12;
    root.style.setProperty("--ds-ui-font-size", `${ui}px`);
    root.style.setProperty("--ds-code-font-size", `${code}px`);
  }, [prefs.uiFontSize, prefs.codeFontSize]);

  return null;
}
