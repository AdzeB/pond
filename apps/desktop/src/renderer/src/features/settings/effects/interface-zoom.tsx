import { useEffect } from "react";
import { usePrefs } from "@/shared/state/prefs";

const INTERFACE_ZOOM_MIN = 50;
const INTERFACE_ZOOM_MAX = 200;

export function clampInterfaceZoom(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(
    INTERFACE_ZOOM_MAX,
    Math.max(INTERFACE_ZOOM_MIN, Math.round(value)),
  );
}

export function applyInterfaceZoom(value: number): void {
  document.documentElement.style.setProperty(
    "zoom",
    String(clampInterfaceZoom(value) / 100),
  );
}

export function InterfaceZoom() {
  const [windowPrefs] = usePrefs("window");

  useEffect(() => {
    applyInterfaceZoom(windowPrefs.interfaceZoom);
    return () => {
      document.documentElement.style.removeProperty("zoom");
    };
  }, [windowPrefs.interfaceZoom]);

  return null;
}
