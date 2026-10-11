import { matchesShortcut } from "@/shared/lib/shortcuts";

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function asElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isEditableElement(element: Element): boolean {
  if (element instanceof HTMLInputElement) {
    return !NON_TEXT_INPUTS.has(element.type.toLowerCase());
  }
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (element instanceof HTMLElement) {
    if (element.isContentEditable) return true;
    const mode = element.contentEditable?.toLowerCase();
    if (mode === "true" || mode === "plaintext-only") return true;
  }
  return (
    element.closest(
      "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='searchbox']",
    ) != null
  );
}

export function isEditableTarget(
  target: EventTarget | null = document.activeElement,
): boolean {
  const element = asElement(target);
  return element != null && isEditableElement(element);
}

export function eventFromEditable(event: KeyboardEvent): boolean {
  if (isEditableTarget(document.activeElement)) return true;
  if (isEditableTarget(event.target)) return true;
  return event.composedPath().some((node) => isEditableTarget(node));
}

export function stopAppHotkeysFromEditable(event: {
  nativeEvent: KeyboardEvent;
  stopPropagation: () => void;
}): void {
  if (matchesShortcut(event.nativeEvent, "library.search")) return;
  event.stopPropagation();
}
