import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { type OverlayResult, sendMessage } from "@/utils/messaging";
import { paintTheme } from "@/utils/paint-theme";
import { Details } from "../details";
import { Dock } from "../dock";
import { ImagePicker } from "../images";
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
  const { appearance, tool } = useSyncExternalStore(
    store.subscribe,
    store.getState,
  );
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(
    () => paintTheme(container, appearance),
    [container, appearance],
  );

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
      {tool?.view === "images" && layer ? (
        <ImagePicker
          library={tool.library}
          container={layer}
          onFinish={finish}
        />
      ) : null}
      {tool?.view === "details" && layer ? (
        <Details
          key={tool.draft.url + tool.draft.title}
          draft={tool.draft}
          library={tool.library}
          container={layer}
          onFinish={finish}
        />
      ) : null}
      {tool?.view === "dock" ? (
        <Dock item={tool.item} folders={tool.folders} onFinish={finish} />
      ) : null}
      {layer ? <Toasts manager={store.toasts} container={layer} /> : null}
    </div>
  );
}
