import { Keyboard } from "@pond/ui";
import { Fragment } from "react";
import {
  chordGlyphs,
  type ShortcutId,
  shortcutChord,
  shortcutSequence,
  useShortcutBindings,
} from "@/shared/lib/shortcuts";
import styles from "./styles.module.css";

export function ShortcutKeys({ id }: { id: ShortcutId }) {
  useShortcutBindings();
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
