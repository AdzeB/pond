import { IconArrowLeft, IconArrowRight, IconDots } from "@pond/icons";
import { useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { Art, type ArtKind } from "./art";
import { Chat } from "./chat";
import { Downloads } from "./downloads";
import { Inspector } from "./inspector";
import { Sidebar } from "./sidebar";
import styles from "./styles.module.css";
import { Toolbar } from "./toolbar";

const STATES = ["harvest", "library", "preview", "enrich", "agent"] as const;
const HOLD = 2800;

const saves: ReadonlyArray<{
  id: string;
  kind: ArtKind;
  title: string;
  meta: string;
}> = [
  { id: "trail", kind: "mountain", title: "Mountain trail", meta: "2m ago" },
  { id: "sunset", kind: "sunset", title: "Sunset over the bay", meta: "Now" },
  { id: "brand", kind: "doc", title: "Brand guidelines", meta: "1h ago" },
  { id: "tour", kind: "video", title: "Studio tour", meta: "Yesterday" },
  { id: "font", kind: "font", title: "Inter Display", meta: "Yesterday" },
  { id: "palette", kind: "swatch", title: "Spring palette", meta: "Monday" },
];

export function Demo() {
  const reduceMotion = useReducedMotionConfig();
  const [step, setStep] = useState(() => (reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setStep((current) => (current + 1) % STATES.length),
      HOLD,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);
  return (
    <div className={styles.window} data-state={STATES[step]}>
      <Toolbar />
      <Sidebar />
      <div className={styles.panel}>
        <Downloads />
        <div className={styles.grid}>
          {saves.map((save) => (
            <div className={styles.card} key={save.id}>
              <span className={styles.frame}>
                <Art kind={save.kind} />
              </span>
              <span className={styles.name}>{save.title}</span>
              <span className={styles.meta}>{save.meta}</span>
            </div>
          ))}
        </div>
        <div className={styles.viewer}>
          <span className={styles.icons}>
            <IconArrowLeft />
            <IconArrowRight />
          </span>
          <span className={styles["viewer-title"]}>Sunset over the bay</span>
          <IconDots />
        </div>
      </div>
      <aside className={styles.pane}>
        <Inspector />
        <Chat />
      </aside>
      <span className={styles.save}>
        <Art kind="sunset" size="fill" />
      </span>
    </div>
  );
}
