import { createHoverGate } from "@pond/ui/sounds";
import { useEffect } from "react";
import {
  playUiHover,
  playUiSoft,
  playUiTap,
  playUiToggle,
} from "@/shared/lib/sounds";

const INTERACTIVE_SELECTOR = [
  "button",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  "a[href]",
].join(",");

const TOGGLE_SELECTOR = [
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="menuitemcheckbox"]',
  'input[type="checkbox"]',
  "[aria-pressed]",
].join(",");

/** Options and menu items fill whole grids and lists, so only discrete controls tick on hover. */
const HOVER_SELECTOR = 'a[href], button, [role="button"]';

const TEXT_FIELD_SELECTOR = "input, textarea, select, [contenteditable]";

const SOFT_VARIANTS = new Set(["ghost", "tertiary", "link"]);

function asElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Node)) return null;
  return target instanceof Element ? target : target.parentElement;
}

function closestControl(el: Element | null): Element | null {
  return el?.closest(INTERACTIVE_SELECTOR) ?? null;
}

function shouldSkip(control: Element, from: Element): boolean {
  if (from.closest('[data-sound="none"]')) return true;
  if (control.closest('[data-sound="none"]')) return true;
  if (from.closest(TEXT_FIELD_SELECTOR) && !control.matches(TOGGLE_SELECTOR)) {
    return true;
  }
  if (
    control.matches(TEXT_FIELD_SELECTOR) &&
    !control.matches(TOGGLE_SELECTOR)
  ) {
    return true;
  }
  if (
    control instanceof HTMLButtonElement ||
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLOptionElement
  ) {
    if (control.disabled) return true;
  }
  if (control.getAttribute("aria-disabled") === "true") return true;
  return false;
}

function isSoft(control: Element): boolean {
  const variant = control.getAttribute("data-variant");
  return variant !== null && SOFT_VARIANTS.has(variant);
}

function isToggle(control: Element): boolean {
  return control.matches(TOGGLE_SELECTOR);
}

/**
 * A checkbox flips before the browser dispatches the click, but ARIA state is committed by React
 * afterwards, so a capture listener still reads the value the control is leaving.
 */
export function toggleTurnsOn(control: Element): boolean {
  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    return control.checked;
  }
  const pressed = control.getAttribute("aria-pressed");
  if (pressed !== null) return pressed !== "true";
  const checked = control.getAttribute("aria-checked");
  if (checked !== null) return checked !== "true";
  return false;
}

export function UiSounds() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const from = asElement(event.target);
      if (!from) return;
      const control = closestControl(from);
      if (!control || shouldSkip(control, from)) return;
      if (isToggle(control)) return;
      if (isSoft(control)) playUiSoft();
      else playUiTap();
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const from = asElement(event.target);
      if (!from) return;
      const control = from.closest(TOGGLE_SELECTOR) ?? closestControl(from);
      if (!control || !isToggle(control) || shouldSkip(control, from)) return;
      playUiToggle(toggleTurnsOn(control));
    };

    const hover = createHoverGate();

    /** A background window still gets pointerover, and ticking behind another app is noise. */
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !document.hasFocus()) return;
      const from = asElement(event.target);
      const control = from?.closest(HOVER_SELECTOR);
      if (!from || !control || shouldSkip(control, from)) return;
      if (hover.enter(control, event.timeStamp)) playUiHover();
    };

    const onPointerOut = (event: PointerEvent) => {
      const control = asElement(event.target)?.closest(HOVER_SELECTOR);
      if (control) hover.leave(control, asElement(event.relatedTarget));
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
    };
  }, []);

  return null;
}
