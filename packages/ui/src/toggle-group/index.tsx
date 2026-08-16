import { ToggleGroup as Base } from "@base-ui/react/toggle-group";
import { clsx as cn } from "clsx";
import { useLayoutEffect, useRef } from "react";
import styles from "./styles.module.css";

function pressedToggle(root: HTMLElement): HTMLElement | null {
  const pressed = root.querySelectorAll<HTMLElement>("[data-pressed]");
  return pressed.length === 1 ? pressed.item(0) : null;
}

/** Geometry is measured from the pressed toggle so CSS can tween between the previous and next boxes. */
function placePill(
  pill: HTMLElement,
  tab: HTMLElement | null,
  animate: boolean,
): void {
  if (!animate) pill.dataset.snap = "";
  if (tab) {
    pill.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
    pill.style.height = `${tab.offsetHeight}px`;
  } else {
    pill.style.width = "0";
    pill.style.height = "0";
  }
  if (!animate) {
    void pill.offsetWidth;
    delete pill.dataset.snap;
  }
}

/**
 * Segmented control track for Toggles sharing pressed state; single-select by default, `multiple` for independent toggles.
 * The marker attribute lets the Toggle stylesheet restyle its items.
 */
export function ToggleGroup({
  className,
  children,
  multiple,
  ...props
}: Base.Props) {
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (multiple) return;
    const pill = pillRef.current;
    const root = pill?.parentElement;
    if (!pill || !root) return;

    let ready = false;
    const sync = (animate: boolean) => {
      placePill(pill, pressedToggle(root), animate);
    };

    sync(false);

    const mo = new MutationObserver(() => sync(ready));
    mo.observe(root, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-pressed"],
    });

    const ro = new ResizeObserver(() => sync(false));
    ro.observe(root);

    ready = true;
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [multiple]);

  return (
    <Base
      data-pond-toggle-group=""
      className={cn(styles.root, className)}
      multiple={multiple}
      {...props}
    >
      {multiple ? null : (
        <span ref={pillRef} className={styles.pill} aria-hidden="true" />
      )}
      {children}
    </Base>
  );
}
