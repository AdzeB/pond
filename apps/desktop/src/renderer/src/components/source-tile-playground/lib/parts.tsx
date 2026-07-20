import { getSourceDef } from "@/lib/save/sources-registry";
import type { MockTile } from "./mock";
import styles from "./parts.module.css";

/** Shared scaffolding for the proposal variants; each variant decorates the cover and picks its own text lines. */

export function Cover({
  tile,
  children,
  hideBrand,
}: {
  tile: MockTile;
  children?: React.ReactNode;
  hideBrand?: boolean;
}) {
  const { logo } = getSourceDef(tile.source);

  return (
    <span className={styles.cover}>
      {tile.avatar ? (
        <span className={styles.frame}>
          <img src={tile.avatar} alt="" className={styles.pfp} />
          {!hideBrand && logo ? (
            <img
              width={16}
              height={16}
              src={logo}
              alt=""
              className={styles.brand}
            />
          ) : null}
        </span>
      ) : (
        <img
          width={16}
          height={16}
          src={logo ?? undefined}
          alt=""
          className={styles.appicon}
        />
      )}
      {children}
    </span>
  );
}

export function Frame({
  tile,
  onOpen,
  children,
}: {
  tile: MockTile;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.tile}
      onClick={onOpen}
      data-id={tile.id}
    >
      {children}
    </button>
  );
}

export function Name({ children }: { children: React.ReactNode }) {
  return <span className={styles.name}>{children}</span>;
}

export function Sub({
  tone,
  children,
}: {
  tone?: "warn" | "err" | "run" | "ok";
  children: React.ReactNode;
}) {
  return (
    <span className={styles.sub} data-tone={tone}>
      {children}
    </span>
  );
}
