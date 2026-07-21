import { IconGithub } from "@pond/icons/social-media";
import { Wordmark } from "../_fragments/mark";
import styles from "./styles.module.css";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#setup" },
  { label: "FAQs", href: "#faqs" },
] as const;

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label="Pond, back to top">
          <Wordmark size={14} />
        </a>
        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} className={styles["nav-link"]} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.actions}>
          <a
            className={styles["nav-link"]}
            href="https://github.com/raphaelsalaja/pond"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <IconGithub width={14} height={14} fill="currentColor" />
          </a>
          <a className={styles.cta} href="#get">
            Early access
          </a>
        </div>
      </div>
    </header>
  );
}
