import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { patchSearch } from "@/lib/navigate-path";
import {
  isLayoutValue,
  type LayoutValue,
  writeViewPref,
} from "@/lib/view-prefs";

export function LayoutMenuBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    return window.pond.onMenuAction((id) => {
      if (!id.startsWith("view.layout.")) return;
      if (id === "view.layout.cycle") return;
      const next = id.slice("view.layout.".length) as LayoutValue;
      if (!isLayoutValue(next)) return;
      writeViewPref("view", next);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next === "waterfall") delete out.view;
          else out.view = next;
          return out;
        },
        { replace: true },
      );
    });
  }, [navigate]);
  return null;
}
