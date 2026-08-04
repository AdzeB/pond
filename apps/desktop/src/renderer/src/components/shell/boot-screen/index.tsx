import { useEffect } from "react";
import { useBootReady } from "@/hooks/use-saves";

const BOOT_FADE_MS = 220;

let dismissStarted = false;

function dismissBootCover(): void {
  if (dismissStarted) return;
  const el = document.getElementById("boot");
  if (!el) return;
  dismissStarted = true;

  el.dataset.state = "out";
  el.setAttribute("aria-busy", "false");

  const remove = () => {
    el.remove();
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    remove();
    return;
  }

  el.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName !== "opacity") return;
      remove();
    },
    { once: true },
  );
  window.setTimeout(remove, BOOT_FADE_MS);
}

/** Dismisses the HTML launch cover once the save pool is ready. */
export function BootScreen() {
  const bootReady = useBootReady();

  useEffect(() => {
    if (!bootReady) return;
    dismissBootCover();
  }, [bootReady]);

  return null;
}
