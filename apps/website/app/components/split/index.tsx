import { AppWindow } from "../_mocks/app-window";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

const CAPABILITIES = [
  "Captions",
  "Text in images",
  "Transcripts",
  "Visual search",
] as const;

export function Split() {
  return (
    <section id="local" className={styles.split}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.index}>01</p>
          <Section.Title>
            Never touches a <em>server</em>
          </Section.Title>
          <p className={styles.lead}>
            The extension talks to Pond on your Mac through native messaging.
            On-device enrichment never leaves the machine. Ask runs locally with
            Minnow.
          </p>
          <p className={styles.aside}>On-device.</p>
          <ul className={styles.list}>
            {CAPABILITIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.stage} aria-hidden>
          <div className={styles.shot}>
            <div className={styles.canvas}>
              <AppWindow />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
