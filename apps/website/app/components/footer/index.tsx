import { Wordmark } from "../_fragments/mark";
import styles from "./styles.module.css";

const NOW = new Date().getFullYear();

const COLUMNS = [
  {
    label: "Product",
    links: [
      { label: "Save", href: "#save" },
      { label: "Browse", href: "#browse" },
      { label: "Find", href: "#find" },
      { label: "Own", href: "#own" },
      { label: "FAQs", href: "#faqs" },
    ],
  },
  {
    label: "Get",
    links: [
      { label: "Early access", href: "#get" },
      { label: "Updates", href: "#updates" },
    ],
  },
  {
    label: "Project",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/raphaelsalaja/pond",
        external: true,
      },
      {
        label: "Security",
        href: "https://github.com/raphaelsalaja/pond/blob/main/SECURITY.md",
        external: true,
      },
      {
        label: "Privacy",
        href: "https://github.com/raphaelsalaja/pond/blob/main/PRIVACY.md",
        external: true,
      },
      {
        label: "License",
        href: "https://github.com/raphaelsalaja/pond/blob/main/LICENSE",
        external: true,
      },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Wordmark size={13} />
          <p className={styles.tagline}>
            A local-first archive for the open web.
          </p>
          <p className={styles.build}>
            <span className={styles.version}>v0.1.0</span>
            <span className={styles.muted}>{NOW} · MIT</span>
          </p>
        </div>
        <nav className={styles.columns} aria-label="Footer">
          {COLUMNS.map((column) => (
            <div key={column.label} className={styles.column}>
              <p className={styles["column-label"]}>{column.label}</p>
              {column.links.map((link) => (
                <a
                  key={link.label}
                  className={styles.link}
                  href={link.href}
                  {...("external" in link && link.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
