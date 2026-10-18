import styles from "./styles.module.css";

export type ArtKind =
  | "sunset"
  | "mountain"
  | "doc"
  | "video"
  | "font"
  | "swatch";

export function Art({ kind, size }: { kind: ArtKind; size?: "fill" | "slot" }) {
  return (
    <span className={styles.art} data-kind={kind} data-size={size}>
      {kind === "sunset" ? (
        <>
          <span className={styles.sun} />
          <span className={styles.sea} />
        </>
      ) : null}
      {kind === "doc" || kind === "swatch" ? (
        <>
          <span />
          <span />
          <span />
          <span />
        </>
      ) : null}
      {kind === "font" ? "Aa" : null}
    </span>
  );
}
