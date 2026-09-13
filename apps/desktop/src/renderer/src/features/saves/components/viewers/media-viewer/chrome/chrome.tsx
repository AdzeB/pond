import { Toolbar } from "@pond/ui";
import { createContext, type ReactNode, use, useState } from "react";
import { createPortal } from "react-dom";
import { HudHost } from "@/features/saves/components/viewers/hud";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

interface ChromeSlots {
  top: HTMLElement | null;
  bottom: HTMLElement | null;
}

const ChromeContext = createContext<ChromeSlots | null>(null);

export function useViewerChrome(): ChromeSlots | null {
  return use(ChromeContext);
}

export function ChromePortal({
  slot,
  children,
}: {
  slot: keyof ChromeSlots;
  children: ReactNode;
}) {
  const chrome = useViewerChrome();
  const target = chrome?.[slot];
  if (target) return createPortal(children, target);
  return (
    <div className={styles.fallback} data-slot={slot}>
      {children}
    </div>
  );
}

export function ViewerChrome({ children }: { children: ReactNode }) {
  const [top, setTop] = useState<HTMLElement | null>(null);
  const [bottom, setBottom] = useState<HTMLElement | null>(null);
  const topFade = useScrollFade<HTMLDivElement>();
  const bottomFade = useScrollFade<HTMLDivElement>();

  return (
    <ChromeContext value={{ top, bottom }}>
      <div className={styles.root} data-viewer-root>
        <div className={styles.top} {...topFade}>
          <Toolbar.Root aria-label="Viewer" className={styles.toolbar}>
            <Toolbar.Row>
              <Toolbar.Group fill align="end">
                <div className={styles.tools} ref={setTop} />
              </Toolbar.Group>
            </Toolbar.Row>
          </Toolbar.Root>
        </div>
        <div className={styles.stage}>
          <HudHost>{children}</HudHost>
        </div>
        <div className={styles.bottom} {...bottomFade}>
          <div className={styles.tools} ref={setBottom} />
        </div>
      </div>
    </ChromeContext>
  );
}
