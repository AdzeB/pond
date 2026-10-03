import { primarySelection, selection } from "@/features/saves/state/selection";
import { isEditableTarget } from "@/shared/lib/editable-target";

export function collectionOwnsKeyboard(): boolean {
  const active = document.activeElement;
  if (
    document.querySelector(
      "[role='dialog'], [role='alertdialog'], [role='menu']",
    )
  )
    return false;
  return (
    active instanceof HTMLElement &&
    !isEditableTarget(active) &&
    active.closest("[data-save-collection]") != null
  );
}

export function saveOwnsKeyboard(event: KeyboardEvent): boolean {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    isEditableTarget(event.target)
  )
    return false;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || isEditableTarget(active))
    return false;
  const overlay = active.closest(
    "[role='dialog'], [role='alertdialog'], [role='menu']",
  );
  if (overlay && !overlay.matches("[data-quick-preview]")) return false;
  if (
    !overlay &&
    document.querySelector(
      "[role='dialog'], [role='alertdialog'], [role='menu']",
    )
  )
    return false;
  const inspector = active.closest<HTMLElement>("[data-save-inspector]");
  if (inspector) {
    const id = inspector.dataset.saveInspector;
    return (
      id === primarySelection.get() &&
      selection.snapshot().every((selected) => selected === id)
    );
  }
  return (
    active.closest(
      "[data-save-collection], [data-save-details], [data-quick-preview]",
    ) != null
  );
}
