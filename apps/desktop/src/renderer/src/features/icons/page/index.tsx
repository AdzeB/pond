import * as BrandIcons from "@pond/icons/social-media";
import styles from "./styles.module.css";

const BRANDS = Object.entries(BrandIcons).sort(([a], [b]) =>
  a.localeCompare(b),
);

export function IconGalleryPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Icon Gallery</h1>
        <p className={styles.summary}>
          Every brand icon at its full and compact size.
        </p>
      </header>
      <div className={styles.scroll}>
        <section className={styles.group}>
          <h2 className={styles["group-title"]}>Brand Icons</h2>
          <div className={styles.grid}>
            {BRANDS.map(([name, Icon]) => (
              <figure className={styles.card} key={name}>
                <div className={styles.art}>
                  <Icon width={48} height={48} />
                  <Icon width={18} height={18} />
                </div>
                <figcaption className={styles.id}>{name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
