import { type DragItem, sendMessage } from "@/utils/messaging";
import { getSettings, watchSettings } from "@/utils/settings";
import type { PondSettings } from "@/utils/types";

function webUrl(url: string | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function itemAt(target: EventTarget | null): DragItem | null {
  if (!(target instanceof Element) || target.closest("pond-overlay"))
    return null;
  const media = target.closest("img, video, picture");
  const image =
    media instanceof HTMLPictureElement ? media.querySelector("img") : media;
  if (image instanceof HTMLImageElement) {
    const url = webUrl(image.currentSrc || image.src);
    if (url) return { kind: "media", url, title: image.alt || undefined };
  }
  if (image instanceof HTMLVideoElement) {
    const url = webUrl(image.currentSrc || image.src) ?? webUrl(image.poster);
    if (url) return { kind: "media", url };
  }
  const link = target.closest("a[href]");
  if (link instanceof HTMLAnchorElement) {
    const url = webUrl(link.href);
    const title = link.textContent?.trim().slice(0, 200);
    if (url) return { kind: "link", url, title: title || undefined };
  }
  return null;
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main(ctx) {
    let settings: PondSettings | null = null;
    void getSettings().then((current) => {
      settings = current;
    });
    const stop = watchSettings((next) => {
      settings = next;
    });
    ctx.onInvalidated(stop);

    ctx.addEventListener(
      window,
      "contextmenu",
      (event) => {
        if (!event.altKey || !settings?.altClick) return;
        const item = itemAt(event.target);
        if (!item) return;
        event.preventDefault();
        event.stopPropagation();
        void sendMessage("gesture", { kind: "alt-click", item }).catch(
          () => {},
        );
      },
      { capture: true },
    );

    ctx.addEventListener(
      window,
      "dragstart",
      (event) => {
        if (!settings?.dragToSave) return;
        if (settings.dragBlocked.includes(location.hostname)) return;
        const item = itemAt(event.target);
        if (!item) return;
        void sendMessage("gesture", { kind: "drag-start", item }).catch(
          () => {},
        );
      },
      { capture: true },
    );
  },
});
