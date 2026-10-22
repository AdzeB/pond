import { LOGO_VIEW_BOX } from "@pond/ui";
import type { CSSProperties } from "react";
import { HEART_D, LOGO_D } from "./outlines";
import styles from "./styles.module.css";

const morphTargets: CSSProperties & { "--logo": string; "--heart": string } = {
  "--logo": `path("${LOGO_D}")`,
  "--heart": `path("${HEART_D}")`,
};

export function SupportVisual() {
  return (
    <div className={styles.visual}>
      <span className={styles.step}>
        <svg
          aria-hidden="true"
          className={styles.glyph}
          viewBox={`0 0 ${LOGO_VIEW_BOX} ${LOGO_VIEW_BOX}`}
        >
          <path
            className={styles.outline}
            fillRule="evenodd"
            d={LOGO_D}
            style={morphTargets}
          />
        </svg>
      </span>
    </div>
  );
}
