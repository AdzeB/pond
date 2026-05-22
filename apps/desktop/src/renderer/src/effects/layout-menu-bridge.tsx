import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  isLayoutValue,
  type LayoutValue,
  writeViewPref,
} from "@/lib/view-prefs";

export function LayoutMenuBridge() {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    return window.pond.onMenuAction((id) => {
      if (!id.startsWith("view.layout.")) return;
      if (id === "view.layout.cycle") return;
      const next = id.slice("view.layout.".length) as LayoutValue;
      if (!isLayoutValue(next)) return;
      const p = new URLSearchParams(params);
      if (next === "waterfall") p.delete("view");
      else p.set("view", next);
      setParams(p, { replace: true });
      writeViewPref("view", next);
    });
  }, [params, setParams]);
  return null;
}
