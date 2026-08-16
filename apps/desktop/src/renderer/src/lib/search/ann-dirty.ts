type DirtyHandler = (ids: readonly string[] | "all") => void;

let textHandler: DirtyHandler | null = null;

export function registerTextAnnDirty(handler: DirtyHandler): void {
  textHandler = handler;
}

export function annMarkDirty(ids: readonly string[] | "all"): void {
  textHandler?.(ids);
}
