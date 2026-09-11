import { useEffect } from "react";
import { isEditableTarget } from "@/shared/lib/editable-target";

export function UndoRedoBridge() {
  useEffect(() => {
    const offUndo = window.pond.onEditUndoRequested(() => {
      if (isEditableTarget()) return;
      void window.pond.undo();
    });
    const offRedo = window.pond.onEditRedoRequested(() => {
      if (isEditableTarget()) return;
      void window.pond.redo();
    });
    return () => {
      offUndo();
      offRedo();
    };
  }, []);

  return null;
}
