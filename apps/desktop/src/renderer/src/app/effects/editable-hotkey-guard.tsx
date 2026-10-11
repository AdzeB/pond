import { useLayoutEffect } from "react";
import { eventFromEditable } from "@/shared/lib/editable-target";
import { matchesShortcut } from "@/shared/lib/shortcuts";

export function EditableHotkeyGuard() {
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!eventFromEditable(event)) return;
      if (matchesShortcut(event, "library.search")) return;
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
