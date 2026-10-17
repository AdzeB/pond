import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { HudHost } from "@/features/saves/components/viewers/hud";
import styles from "./styles.module.css";

type Slot = "top" | "bottom";

interface ChromeSlots {
  enabled: boolean;
  top: HTMLElement;
  bottom: HTMLElement;
}

const ChromeContext = createContext<ChromeSlots | null>(null);

export function ChromePortal({
  slot,
  children,
}: {
  slot: Slot;
  children: ReactNode;
}) {
  const chrome = use(ChromeContext);
  if (chrome?.enabled === false) return null;
  if (chrome) return createPortal(children, chrome[slot]);
  return (
    <div className={styles.fallback} data-slot={slot}>
      {children}
    </div>
  );
}

/** Slots exist before the first commit so stage layout effects measure the final chrome, not an inline fallback. */
function useSlot(slot: Slot) {
  const [element] = useState(() => {
    const tools = document.createElement("div");
    tools.className = styles.tools ?? "";
    tools.dataset.slot = slot;
    return tools;
  });
  const attach = useCallback(
    (host: HTMLDivElement | null) => {
      if (host && element.parentElement !== host) host.append(element);
    },
    [element],
  );
  return [element, attach] as const;
}

export function ViewerChrome({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [top, attachTop] = useSlot("top");
  const [bottom, attachBottom] = useSlot("bottom");

  return (
    <ChromeContext value={{ enabled, top, bottom }}>
      <div
        className={styles.root}
        data-chrome={enabled || undefined}
        data-viewer-root
      >
        {enabled ? <div className={styles.top} ref={attachTop} /> : null}
        <div className={styles.stage}>
          <HudHost enabled={enabled}>{children}</HudHost>
        </div>
        {enabled ? <div className={styles.bottom} ref={attachBottom} /> : null}
      </div>
    </ChromeContext>
  );
}
