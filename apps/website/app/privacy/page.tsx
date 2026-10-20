import { Wordmark } from "@pond/ui/wordmark";
import type { Metadata } from "next";
import styles from "./styles.module.css";

const GITHUB_ISSUES = "https://github.com/raphaelsalaja/pond/issues";

export const metadata: Metadata = {
  title: "Privacy · Pond",
  description:
    "Pond keeps your library on your computer. No accounts, no Pond servers, no analytics.",
};

export default function Privacy() {
  return (
    <main className={styles.page}>
      <a className={styles.home} href="/" aria-label="Pond">
        <Wordmark size={24} />
      </a>
      <article className={styles.article}>
        <header className={styles.section}>
          <h1 className={styles.title}>Privacy</h1>
          <p>
            Pond keeps your library on your computer. There are no Pond
            accounts, no Pond servers, and no analytics in the app, the browser
            extension, or this website.
          </p>
          <p className={styles.muted}>Updated October 20, 2026</p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.heading}>Browser extension</h2>
          <p>
            The extension only talks to the Pond app on your computer, through
            your browser's native messaging. It never sends data to Pond or
            anyone else over the internet.
          </p>
          <p>When you save something, it hands Pond:</p>
          <ul className={styles.list}>
            <li>The page's address and title</li>
            <li>
              The images or screenshots you picked, with the name, rating,
              notes, tags, and folders you set
            </li>
            <li>
              The site's cookies for that page, so Pond can open it signed in as
              you. Pond uses them in a temporary browser session and drops them
              after the save.
            </li>
          </ul>
          <p>
            On supported sites like X, Instagram, and Pinterest, the extension
            watches the site's own save and like requests. When you bookmark a
            post there, it sends that post's address to Pond. Turn this off for
            any site in Pond under Settings, Browser Extension, Sources.
          </p>
          <p>
            When you connect a source in Pond, the extension sends Pond the
            cookies for that site so Pond can sync your saves from it. Pond
            keeps them in a private browser session on your computer.
          </p>
          <p>
            The extension stores its settings and your recent folders and tags
            in your browser's extension storage.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Pond app</h2>
          <p>
            Your library is a folder on your computer. Captions, text in images,
            and transcription run on your computer. Pond connects to:
          </p>
          <ul className={styles.list}>
            <li>The sites you save from, to download posts and media</li>
            <li>GitHub, to check for updates</li>
            <li>
              The AI provider you set up for Assistant, with your own key, and
              only when you use it. A local host you run works too.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>This website</h2>
          <p>
            This site sets no cookies and runs no analytics. Vercel hosts it and
            keeps standard request logs.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Questions</h2>
          <p>
            Open an issue on{" "}
            <a
              className={styles.link}
              href={GITHUB_ISSUES}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
