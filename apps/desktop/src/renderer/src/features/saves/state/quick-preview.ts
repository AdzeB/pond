type QuickPreviewListener = (saveId: string) => void;

const listeners = new Set<QuickPreviewListener>();

export function requestQuickPreview(saveId: string): void {
  for (const listener of listeners) listener(saveId);
}

export function onQuickPreviewRequest(
  listener: QuickPreviewListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
