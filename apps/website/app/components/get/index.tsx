import { SubscribeForm } from "../_fragments/subscribe-form";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

export function Get() {
  return (
    <Section.Root id="get">
      <div className={styles.stack}>
        <h2 className={styles.title}>Your pond is waiting.</h2>
        <p className={styles.lead}>
          Early access is rolling out by email. Free and open source, macOS 12
          or later, Apple Silicon and Intel.
        </p>
        <div className={styles.form} id="updates">
          <SubscribeForm />
        </div>
        <p className={styles.meta}>
          New releases, new sources, and the occasional changelog. No spam,
          unsubscribe anytime.
        </p>
      </div>
    </Section.Root>
  );
}
