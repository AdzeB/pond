import { dmgUrl } from "@/lib/release";
import { Cta } from "../_fragments/cta";
import { Wordmark } from "../_fragments/mark";
import styles from "./styles.module.css";

const NAV = [
  { label: "Product", href: "#product" },
  { label: "Compare", href: "#compare" },
  { label: "Features", href: "#features" },
  { label: "FAQs", href: "#faqs" },
] as const;

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label="Pond, back to top">
          <Wordmark size={16} />
        </a>
        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} className={styles.link} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.actions}>
          <a
            className={styles.link}
            href="https://github.com/raphaelsalaja/pond"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <Cta href={dmgUrl("arm64")}>Download</Cta>
        </div>
      </div>
    </header>
  );
}
