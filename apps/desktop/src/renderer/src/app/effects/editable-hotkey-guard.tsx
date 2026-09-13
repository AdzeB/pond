import { useEffect } from "react";
import { eventFromEditable } from "@/shared/lib/editable-target";

function allowEscapeInField(event: KeyboardEvent): boolean {
  return event.key === "Escape";
}

function allowSearchPondInField(event: KeyboardEvent): boolean {
  if (event.altKey || event.shiftKey) return false;
  if (!(event.metaKey || event.ctrlKey)) return false;
  return event.key === "k" || event.key === "K";
}

export function EditableHotkeyGuard() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        allowEscapeInField(event) ||
        allowSearchPondInField(event) ||
        !eventFromEditable(event)
      )
        return;
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
