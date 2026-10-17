import { useEffect } from "react";
import { useSave } from "@/features/saves/hooks/use-saves";
import {
  preloadImage,
  viewerImageUrl,
} from "@/features/saves/lib/media/preload";
import { useSelectionCursor } from "@/features/saves/state/selection";
import { useResolvedTheme } from "@/shared/hooks/use-resolved-theme";

/** Arrow-key sweeps settle before decoding, so only the save you stop on pays for its original. */
const SETTLE_MS = 80;

export function ViewerPreload() {
  const theme = useResolvedTheme();
  const cursor = useSelectionCursor();
  const save = useSave(cursor);
  const url = save ? viewerImageUrl(save, theme) : null;

  useEffect(() => {
    if (!url) return;
    const timer = window.setTimeout(() => preloadImage(url), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [url]);

  return null;
}
