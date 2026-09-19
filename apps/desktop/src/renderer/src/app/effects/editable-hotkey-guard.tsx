import { useLayoutEffect } from "react";
import {
  allowAppHotkeyInEditable,
  eventFromEditable,
} from "@/shared/lib/editable-target";

export function EditableHotkeyGuard() {
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (allowAppHotkeyInEditable(event) || !eventFromEditable(event)) return;
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
