import type { Source } from "@pond/schema/db";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

/** Each `IconBrand*` is full-bleed with its own background rect, so clipping to a rounded box yields the app-icon look. */
export function BrandTile({
  source,
  size = 36,
}: {
  source: Source;
  size?: number;
}) {
  const Icon = getSourceDef(source).icon;
  return (
    <span
      className={styles["brand-tile"]}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon width={size} height={size} />
    </span>
  );
}
