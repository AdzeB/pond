import "./toolbar/host.css";
import { createRoot, type Root } from "react-dom/client";
import { getSettings } from "@/utils/settings";
import { ToolbarApp } from "./toolbar/App";

const TOGGLE = "pond:toggle-toolbar";
const VISIBLE_KEY = "pond:toolbar-visible";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_idle",

  async main(ctx) {
    if (window !== window.top) return;

    let visible = false;
    try {
      const settings = await getSettings();
      if (!settings.apiKey) {
        visible = true;
      } else {
        const stored = await chrome.storage.session.get(VISIBLE_KEY);
        visible = Boolean(stored[VISIBLE_KEY]);
      }
    } catch {
      visible = false;
    }

    let root: Root | null = null;
    let setVisible: ((next: boolean) => void) | null = null;

    const ui = await createShadowRootUi(ctx, {
      name: "pond-toolbar",
      position: "overlay",
      zIndex: 2147483646,
      isolateEvents: true,
      onMount(container) {
        const host = document.createElement("div");
        host.className = "pond-toolbar-host";
        container.append(host);
        root = createRoot(host);

        function render(next: boolean) {
          root?.render(
            <ToolbarApp visible={next} onClose={() => setVisible?.(false)} />,
          );
        }

        setVisible = (next: boolean) => {
          visible = next;
          void chrome.storage.session.set({ [VISIBLE_KEY]: next });
          render(next);
        };

        render(visible);
        return root;
      },
      onRemove() {
        root?.unmount();
        root = null;
        setVisible = null;
      },
    });

    ui.mount();

    chrome.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== TOGGLE) return;
      setVisible?.(!visible);
    });
  },
});
