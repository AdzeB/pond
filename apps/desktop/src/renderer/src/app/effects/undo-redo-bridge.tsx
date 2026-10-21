import { useEffect } from "react";
import { isEditableTarget } from "@/shared/lib/editable-target";
import { currentUndoOwner } from "@/shared/lib/undo-owner";

export function UndoRedoBridge() {
  useEffect(() => {
    const offUndo = window.pond.onEditUndoRequested(() => {
      if (isEditableTarget()) return;
      const owner = currentUndoOwner();
      if (owner) owner.undo();
      else void window.pond.undo();
    });
    const offRedo = window.pond.onEditRedoRequested(() => {
      if (isEditableTarget()) return;
      const owner = currentUndoOwner();
      if (owner) owner.redo();
      else void window.pond.redo();
    });
    return () => {
      offUndo();
      offRedo();
    };
  }, []);

  return null;
}
