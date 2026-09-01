import { useEffect } from "react";

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

function isEditableTarget(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !NON_TEXT_INPUTS.has(el.type.toLowerCase());
  }
  return false;
}

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);
