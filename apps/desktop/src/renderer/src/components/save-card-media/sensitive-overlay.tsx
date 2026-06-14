import { IconEyeOpenFill18 as Eye } from "@pond/icons/fill/18";
import { useState } from "react";
import styles from "./styles.module.css";

export function SensitiveOverlay({ onReveal }: { onReveal: () => void }) {
  // Animate out locally, then commit the reveal on transition end. The parent
  // keeps this mounted (blurred stays true) until onReveal fires, so the fade
  // is actually visible instead of the overlay unmounting instantly.
  const [revealing, setRevealing] = useState(false);

  return (
    <button
      type="button"
      className={styles.sensitive}
      data-revealing={revealing || undefined}
      aria-label="Reveal sensitive media"
      title="Sensitive media — click to reveal"
      disabled={revealing}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setRevealing(true);
      }}
      onTransitionEnd={(e) => {
        if (revealing && e.target === e.currentTarget) onReveal();
      }}
    >
      <Eye width={18} height={18} aria-hidden />
    </button>
  );
}
