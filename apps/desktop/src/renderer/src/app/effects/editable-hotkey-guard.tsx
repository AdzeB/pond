import { useLayoutEffect } from "react";
import { appHotkeyBlockedByEditable } from "@/shared/lib/editable-target";

export function EditableHotkeyGuard() {
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!appHotkeyBlockedByEditable(event)) return;
      event.stopImmediatePropagation();
    };
    /** Window capture runs before TanStack hotkeys, which register on window without capture. */
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  return null;
}
