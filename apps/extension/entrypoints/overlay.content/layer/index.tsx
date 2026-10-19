import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { type OverlayResult, sendMessage } from "@/utils/messaging";
import { paintTheme } from "@/utils/paint-theme";
import { ElementPicker } from "../element";
import { ImageCollector } from "../images";
import { RegionPicker } from "../region";
import type { OverlayStore } from "../store";
import { Toasts } from "../toasts";
import styles from "./styles.module.css";

interface LayerProps {
  store: OverlayStore;
  container: HTMLElement;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function Layer({ store, container }: LayerProps) {
  const { theme, tool } = useSyncExternalStore(store.subscribe, store.getState);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => paintTheme(container, theme), [container, theme]);

  const finish = async (result: OverlayResult | null) => {
    store.closeTool();
    if (!result) return;
    /** Two frames let the picker unpaint before the background screenshots the tab. */
    await nextFrame();
    await nextFrame();
    await sendMessage("overlayResult", result).catch(() => {});
  };

  return (
    <div ref={setLayer} className={styles.layer}>
      {tool?.view === "region" ? <RegionPicker onFinish={finish} /> : null}
      {tool?.view === "element" ? <ElementPicker onFinish={finish} /> : null}
      {tool?.view === "images" && layer ? (
        <ImageCollector
          folders={tool.folders}
          container={layer}
          onFinish={finish}
        />
      ) : null}
      {layer ? <Toasts manager={store.toasts} container={layer} /> : null}
    </div>
  );
}
