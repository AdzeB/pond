import { useState } from "react";
import { useSaveTransitionSettled } from "@/features/saves/lib/save-transition";

/**
 * Shows viewer media once it can paint and any save transition has landed, then keeps it shown for that source.
 * @remarks The open morph hands off to the card-thumbnail placeholder, so revealing earlier would swap it for the full media mid-flight.
 */
export function useMediaReveal(ready: boolean, source: string): boolean {
  const settled = useSaveTransitionSettled();
  const [shownSource, setShownSource] = useState<string | null>(null);
  const shown = shownSource === source || (ready && settled);
  if (shown && shownSource !== source) setShownSource(source);
  return shown;
}
