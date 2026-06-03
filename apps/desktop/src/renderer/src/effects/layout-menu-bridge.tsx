import { useEffect } from "react";
import { isLayoutValue, type LayoutValue } from "@/lib/view-prefs";
import { setLayout } from "@/lib/view-store";

export function LayoutMenuBridge() {
  useEffect(() => {
    return window.pond.onMenuAction((id) => {
      if (!id.startsWith("view.layout.")) return;
      if (id === "view.layout.cycle") return;
      const next = id.slice("view.layout.".length) as LayoutValue;
      if (!isLayoutValue(next)) return;
      setLayout(next);
    });
  }, []);
  return null;
}
