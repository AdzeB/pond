import type { ComponentType, SVGProps } from "react";
import styles from "./fragments.module.css";

export interface SourcePillProps {
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  hex?: string;
  contrast?: "light" | "dark";
}

export function SourcePill({
  name,
  icon: Icon,
  description,
  hex,
  contrast = "light",
}: SourcePillProps) {
  return (
    <div className={styles["source-pill"]}>
      <div
        className={styles["source-pill-mark"]}
        data-contrast={contrast}
        style={hex ? { background: hex } : undefined}
      >
        <Icon width={18} height={18} fill="currentColor" />
      </div>
      <div className={styles["source-pill-body"]}>
        <span className={styles["source-pill-name"]}>{name}</span>
        <span className={styles["source-pill-description"]}>{description}</span>
      </div>
    </div>
  );
}
