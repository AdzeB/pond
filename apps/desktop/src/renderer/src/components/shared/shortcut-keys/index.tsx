import { Keyboard } from "@pond/ui";
import { Fragment } from "react";
import {
  chordGlyphs,
  type ShortcutId,
  shortcutChord,
  shortcutSequence,
} from "@/lib/save/shortcuts";
import styles from "./styles.module.css";

/** Linear-style keycap cluster for a shortcut id (chords or `G then L` sequences). */
export function ShortcutKeys({ id }: { id: ShortcutId }) {
  const sequence = shortcutSequence(id);
  if (sequence) {
    return (
      <span className={styles.sequence} aria-hidden>
        {sequence.map((step, i) => (
          <Fragment key={step}>
            {i > 0 ? <span className={styles.then}>then</span> : null}
            <Keyboard.Cluster keys={chordGlyphs(step)} />
          </Fragment>
        ))}
      </span>
    );
  }
  const keys = shortcutChord(id);
  if (keys) {
    return <Keyboard.Cluster keys={chordGlyphs(keys)} />;
  }
  return null;
}
