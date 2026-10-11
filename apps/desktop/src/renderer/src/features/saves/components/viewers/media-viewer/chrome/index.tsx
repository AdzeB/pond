import { createContext, type ReactNode, use, useState } from "react";
import { createPortal } from "react-dom";
import { HudHost } from "@/features/saves/components/viewers/hud";
import styles from "./styles.module.css";

interface ChromeSlots {
  enabled: boolean;
  top: HTMLElement | null;
  bottom: HTMLElement | null;
}

const ChromeContext = createContext<ChromeSlots | null>(null);

export function ChromePortal({
  slot,
  children,
}: {
  slot: "top" | "bottom";
  children: ReactNode;
}) {
  const chrome = use(ChromeContext);
  if (chrome?.enabled === false) return null;
  const target = slot === "top" ? chrome?.top : chrome?.bottom;
  if (target) return createPortal(children, target);
  return (
    <div className={styles.fallback} data-slot={slot}>
      {children}
    </div>
  );
}

export function ViewerChrome({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [top, setTop] = useState<HTMLElement | null>(null);
  const [bottom, setBottom] = useState<HTMLElement | null>(null);

  return (
    <ChromeContext value={{ enabled, top, bottom }}>
      <div
        className={styles.root}
        data-chrome={enabled || undefined}
        data-viewer-root
      >
        {enabled ? (
          <div className={styles.top}>
            <div className={styles.tools} data-slot="top" ref={setTop} />
          </div>
        ) : null}
        <div className={styles.stage}>
          <HudHost enabled={enabled}>{children}</HudHost>
        </div>
        {enabled ? (
          <div className={styles.bottom}>
            <div className={styles.tools} data-slot="bottom" ref={setBottom} />
          </div>
        ) : null}
      </div>
    </ChromeContext>
  );
}
