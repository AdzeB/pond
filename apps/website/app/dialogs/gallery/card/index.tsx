import { Button, Dialog } from "@pond/ui";
import type { ReactNode } from "react";
import type { DialogExample } from "../catalog";
import styles from "./styles.module.css";

export function Card({
  example,
  onInspect,
  children,
}: {
  example: DialogExample;
  onInspect: () => void;
  children: ReactNode;
}) {
  return (
    <article className={styles.card} id={example.id}>
      <div className={styles.header}>
        <div>
          <span className={styles.badge}>{example.group}</span>
          <span className={styles.kind}>{example.kind}</span>
        </div>
        <Button
          size="xs"
          variant="ghost"
          onClick={onInspect}
          aria-label={`Inspect ${example.title}`}
        >
          Inspect ↗
        </Button>
      </div>
      <div className={styles.stage}>
        <Dialog.Preview
          className={styles.specimen}
          inert
          style={{ maxWidth: example.width }}
        >
          {children}
        </Dialog.Preview>
      </div>
      <footer className={styles.caption}>
        <a href={`#${example.id}`}>{example.title}</a>
        <span>{example.width}px</span>
        <details>
          <summary>Source</summary>
          <code>apps/desktop/src/renderer/src/{example.source}</code>
        </details>
      </footer>
    </article>
  );
}
