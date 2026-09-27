import { useLayoutEffect } from "react";
import { eventFromEditable } from "@/shared/lib/editable-target";

export function EditableHotkeyGuard() {
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!eventFromEditable(event)) return;
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
