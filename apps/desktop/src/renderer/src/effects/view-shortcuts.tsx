import { useEffect } from "react";
import { toggleInspector } from "@/lib/use-inspector";
import { toggleSidebar } from "@/lib/use-sidebar";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function ViewShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;

      if (!meta && !e.altKey && !e.shiftKey) {
        if (e.key === "[") {
          e.preventDefault();
          toggleSidebar();
          return;
        }
        if (e.key === "]") {
          e.preventDefault();
          toggleInspector();
          return;
        }
      }

      // Cmd+Alt+1 / Cmd+Alt+2 are kept alongside `[` / `]` for users
      // who rely on modifier combos (a11y, remapped keyboards).
      if (!meta || !e.altKey || e.shiftKey) return;

      if (e.key === "1" || e.code === "Digit1") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (e.key === "2" || e.code === "Digit2") {
        e.preventDefault();
        toggleInspector();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
