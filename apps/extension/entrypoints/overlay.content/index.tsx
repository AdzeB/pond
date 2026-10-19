import "./shadow.css";

import { createRoot } from "react-dom/client";
import { onOverlayMessage } from "@/utils/overlay-messaging";
import { Layer } from "./layer";
import { createOverlayStore } from "./store";

export default defineContentScript({
  registration: "runtime",
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  main(ctx) {
    const store = createOverlayStore();
    /** The background messages right after injecting, so listen before the shadow root mounts. */
    const stop = onOverlayMessage("show", ({ data }) => {
      store.show(data.request, data.appearance);
      return true;
    });
    ctx.onInvalidated(stop);

    void createShadowRootUi(ctx, {
      name: "pond-overlay",
      position: "inline",
      anchor: "html",
      onMount(container) {
        const root = createRoot(container);
        root.render(<Layer store={store} container={container} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    }).then((ui) => ui.mount());
  },
});
