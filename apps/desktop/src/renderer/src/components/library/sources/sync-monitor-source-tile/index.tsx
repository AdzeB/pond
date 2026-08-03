import type { Source } from "@pond/schema/db";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

/** Logos and `IconBrand*` fallbacks are full-bleed, so clipping to a rounded box yields the app-icon look. */
export function BrandTile({
  source,
  size = 36,
}: {
  source: Source;
  size?: number;
}) {
  const { icon: Icon, logo } = getSourceDef(source);

  return (
    <span
      className={styles["brand-tile"]}
      style={{ width: size, height: size }}
      data-logo={logo ? "" : undefined}
      aria-hidden
    >
      {logo ? (
        <img src={logo} alt="" width={size} height={size} />
      ) : Icon ? (
        <Icon width={size} height={size} />
      ) : null}
    </span>
  );
}
