import type { PondPreviewApi } from "../../preload/preview";
import { createCopyTranslator } from "../../shared/localization";
import type { PreviewWindowState } from "../../shared/preview-window-contracts";
import "./preview.css";

declare global {
  interface Window {
    pondPreview: PondPreviewApi;
  }
}

const image = document.querySelector<HTMLImageElement>("#image");
const preview = document.querySelector<HTMLElement>("#preview");
if (!image || !preview) throw new Error("Preview surface is missing.");

let state: PreviewWindowState | null = null;

const NEXT_ROTATION = {
  0: 90,
  90: 180,
  180: 270,
  270: 0,
} satisfies Record<
  PreviewWindowState["rotation"],
  PreviewWindowState["rotation"]
>;

function localizePreview(locale: PreviewWindowState["locale"]): void {
  const translate = createCopyTranslator(locale);
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll<HTMLElement>("body *")) {
    for (const node of element.childNodes) {
      if (!(node instanceof Text)) continue;
      const copy = node.data.trim();
      if (!copy) continue;
      const localized = translate(copy);
      if (localized !== copy) node.data = node.data.replace(copy, localized);
    }
    for (const attribute of ["aria-label", "title"] as const) {
      const copy = element.getAttribute(attribute);
      if (!copy) continue;
      const localized = translate(copy);
      if (localized !== copy) element.setAttribute(attribute, localized);
    }
  }
}

function button(id: string, action: () => void): void {
  document
    .querySelector<HTMLButtonElement>(`#${id}`)
    ?.addEventListener("click", action);
}

function configure(
  patch: Omit<Parameters<PondPreviewApi["configure"]>[0], "windowId">,
): void {
  if (!state) return;
  void window.pondPreview.configure({ windowId: state.windowId, ...patch });
}

window.pondPreview.onState((next) => {
  state = next;
  localizePreview(next.locale);
  document.title = next.title;
  image.src = next.url;
  image.alt = next.title;
  image.style.transform = `rotate(${next.rotation}deg) scaleX(${next.mirrored ? -1 : 1})`;
  image.style.filter = next.grayscale ? "grayscale(1)" : "";
  image.dataset.size = next.size;
  document
    .querySelector("#grayscale")
    ?.setAttribute("aria-pressed", String(next.grayscale));
  document
    .querySelector("#mirror")
    ?.setAttribute("aria-pressed", String(next.mirrored));
  document
    .querySelector("#pin")
    ?.setAttribute("aria-pressed", String(next.alwaysOnTop));
  const size = document.querySelector("#size");
  if (size) size.textContent = next.size === "fit" ? "Actual Size" : "Fit";
});
window.pondPreview.onSecurityStateChanged(() => {
  if (state) void window.pondPreview.close(state.windowId);
});

button("rotate", () => {
  if (!state) return;
  configure({ rotation: NEXT_ROTATION[state.rotation] });
});
button("previous", () => {
  if (state)
    void window.pondPreview.requestNeighbor({
      windowId: state.windowId,
      saveId: state.saveId,
      delta: -1,
    });
});
button("next", () => {
  if (state)
    void window.pondPreview.requestNeighbor({
      windowId: state.windowId,
      saveId: state.saveId,
      delta: 1,
    });
});
button("mirror", () => configure({ mirrored: !state?.mirrored }));
button("grayscale", () => configure({ grayscale: !state?.grayscale }));
button("size", () =>
  configure({ size: state?.size === "actual" ? "fit" : "actual" }),
);
button("opacity", () => {
  if (!state) return;
  configure({ opacity: state.opacity <= 0.4 ? 1 : state.opacity - 0.2 });
});
button("pin", () => configure({ alwaysOnTop: !state?.alwaysOnTop }));
button("close", () => {
  if (state) void window.pondPreview.close(state.windowId);
});

window.addEventListener("keydown", (event) => {
  if (state && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    void window.pondPreview.requestNeighbor({
      windowId: state.windowId,
      saveId: state.saveId,
      delta: event.key === "ArrowLeft" ? -1 : 1,
    });
    return;
  }
  if (event.key === "Escape" && state) {
    void window.pondPreview.close(state.windowId);
  }
});
