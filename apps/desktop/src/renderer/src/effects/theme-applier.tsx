import { useEffect } from "react";
import { usePrefs } from "@/pool/prefs";

// Shadowed in localStorage so the inline boot script in index.html can
// restore the right theme/pointer style before the bundle parses, killing
// the FOUC. Read by `<script>` in apps/desktop/src/renderer/index.html.
const SHELL_KEY = "pondShell";

function persistShell(patch: {
  theme?: "light" | "dark";
  pointerCursors?: boolean;
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

    const apply = (resolved: "light" | "dark") => {
      root.setAttribute("data-theme", resolved);
      root.classList.toggle("dark", resolved === "dark");
      root.classList.toggle("light", resolved === "light");
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
    if (prefs.pointerCursors) {
      root.setAttribute("data-pointer-cursors", "true");
    } else {
      root.removeAttribute("data-pointer-cursors");
    }
    persistShell({ pointerCursors: prefs.pointerCursors });
  }, [prefs.pointerCursors]);

  return null;
}
