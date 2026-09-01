import { type RefObject, useLayoutEffect } from "react";
import { completeLibraryLayoutTransition } from "@/lib/ui/library-layout-transition";

export function useLibraryLayoutTransition(
  ref: RefObject<HTMLElement | null>,
  layoutVersion: unknown,
): void {
  useLayoutEffect(() => {
    void layoutVersion;
    const container = ref.current;
    if (container) completeLibraryLayoutTransition(container);
  }, [ref, layoutVersion]);
}
