import { useRef } from "react";
import { useNativeGlassRegion } from "@/hooks/use-native-glass-region";
import styles from "./styles.module.css";

// Live preview of native macOS Liquid Glass. The gradient stage is real web
// content; the framed inset registers a click-through `NSGlassEffectView`
// region over itself (via useNativeGlassRegion), so what you see is the actual
// OS glass material refracting the gradient — not a CSS approximation. Falls
// back to a plain framed panel when the OS can't provide glass.
export function GlassPreview({ style }: { style: "regular" | "clear" }) {
  const ref = useRef<HTMLDivElement>(null);
  const supported =
    typeof window !== "undefined" &&
    window.__pondShell?.glassSupported === true;

  useNativeGlassRegion(ref, { style, cornerRadius: 14 });

  return (
    <div className={styles.preview}>
      <div className={styles.stage}>
        <div ref={ref} className={styles.glass} aria-hidden />
      </div>
      <p className={styles.caption}>
        {supported
          ? "Live preview — real NSGlassEffectView over the gradient."
          : "Preview unavailable — native Liquid Glass needs macOS 26 or later."}
      </p>
    </div>
  );
}
