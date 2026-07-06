import { useCallback, useEffect, useRef } from "react";
import type { AskTurn } from "@/stores/ask-store";

// Auto-scroll bookkeeping for the transcript: only follow new content when the
// user is already pinned to the bottom, but always jump on a brand-new turn.
export function useStickyScroll(turns: ReadonlyArray<AskTurn>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const prevLenRef = useRef(0);

  // Track whether the user is parked at the bottom so streaming updates don't
  // yank them away while they're scrolled up reading earlier turns.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

  // A new turn always scrolls into view; content updates (stage/summary) only
  // follow when already pinned to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = turns.length > prevLenRef.current;
    prevLenRef.current = turns.length;
    if (grew || stickRef.current) {
      el.scrollTop = el.scrollHeight;
      stickRef.current = true;
    }
  }, [turns]);

  return { scrollRef, onScroll };
}
