import { Store } from "@tanstack/store";
export const duplicateReview = new Store<{ id: string; saveId: string } | null>(
  null,
);
export function openDuplicateReview(saveId: string): void {
  duplicateReview.setState(() => ({ id: crypto.randomUUID(), saveId }));
}
export function closeDuplicateReview(): void {
  duplicateReview.setState(() => null);
}
