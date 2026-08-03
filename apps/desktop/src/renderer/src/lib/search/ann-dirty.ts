type DirtyHandler = (ids: readonly string[] | "all") => void;

let textHandler: DirtyHandler | null = null;
let clipHandler: DirtyHandler | null = null;

export function registerTextAnnDirty(handler: DirtyHandler): void {
  textHandler = handler;
}

export function registerClipAnnDirty(handler: DirtyHandler): void {
  clipHandler = handler;
}

export function annMarkDirty(ids: readonly string[] | "all"): void {
  textHandler?.(ids);
}

export function clipAnnMarkDirty(ids: readonly string[] | "all"): void {
  clipHandler?.(ids);
}
