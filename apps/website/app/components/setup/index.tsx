import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

const STEPS = [
  {
    index: "01",
    title: "Get Pond",
    body: "Download the Mac DMG from this site or GitHub Releases. Drag it to Applications. Free, MIT licensed.",
  },
  {
    index: "02",
    title: "Pair the extension",
    body: "Download the extension zip from the same release, load it unpacked in Chrome, then paste the pairing link from Pond's menu bar icon.",
  },
  {
    index: "03",
    title: "Save",
    body: "One keystroke from any page. Saves land in your library instantly, at full quality.",
  },
] as const;

export function Setup() {
  return (
    <Section.Root id="setup">
      <Section.Header>
        <Section.Eyebrow>How it works</Section.Eyebrow>
        <Section.Title>Running in two minutes.</Section.Title>
      </Section.Header>
      <ol className={styles.steps}>
        {STEPS.map((step) => (
          <li key={step.index} className={styles.step}>
            <span className={styles.index}>{step.index}</span>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.body}>{step.body}</p>
          </li>
        ))}
      </ol>
    </Section.Root>
  );
}
