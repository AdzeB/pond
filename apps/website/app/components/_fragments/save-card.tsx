import type { ComponentType, ReactNode, SVGProps } from "react";
import styles from "./fragments.module.css";
import { Thumb } from "./thumb";

interface SaveCardProps {
  title: string;
  source: {
    name: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
  };
  meta?: ReactNode;
  archived?: boolean;
  seed?: number;
  aspect?: number;
  children?: ReactNode;
}

export function SaveCard({
  title,
  source,
  meta,
  archived,
  seed = 3,
  aspect = 1.4,
  children,
}: SaveCardProps) {
  const Icon = source.icon;
  return (
    <article className={styles["save-card"]}>
      <div className={styles["save-card-media"]}>
        {children ?? <Thumb seed={seed} aspect={aspect} />}
        {archived ? <ArchivedChip /> : null}
      </div>
      <div className={styles["save-card-meta"]}>
        <div className={styles["save-card-source"]}>
          <Icon width={12} height={12} fill="currentColor" />
          <span>{source.name}</span>
        </div>
        <h4 className={styles["save-card-title"]}>{title}</h4>
        {meta ? <p className={styles["save-card-sub"]}>{meta}</p> : null}
      </div>
    </article>
  );
}

export function ArchivedChip() {
  return (
    <span className={styles["archived-chip"]}>
      <span className={styles["archived-chip-dot"]} aria-hidden />
      Archived
    </span>
  );
}
