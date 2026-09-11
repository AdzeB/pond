import { useEffect } from "react";
import { eventFromEditable } from "@/shared/lib/editable-target";

/** Search Pond (Mod+K) is the one app chord that should still run in a field. */
function allowInField(event: KeyboardEvent): boolean {
  if (event.key === "Escape") return true;
  if (event.altKey || event.shiftKey) return false;
  if (!(event.metaKey || event.ctrlKey)) return false;
  return event.key === "k" || event.key === "K";
}

export function EditableHotkeyGuard() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (allowInField(event) || !eventFromEditable(event)) return;
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
