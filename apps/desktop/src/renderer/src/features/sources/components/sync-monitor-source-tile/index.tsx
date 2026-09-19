import type { Source } from "@pond/schema/db";
import { getSourceDef } from "@/features/sources/lib/registry";
import styles from "./styles.module.css";

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
      aria-hidden
    >
      {Icon ? (
        <Icon width={size} height={size} />
      ) : logo ? (
        <img src={logo} alt="" width={size} height={size} />
      ) : null}
    </span>
  );
}
