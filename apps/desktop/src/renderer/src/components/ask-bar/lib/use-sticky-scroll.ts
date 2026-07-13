import { useCallback, useEffect, useRef } from "react";
import type { AskTurn } from "@/stores/ask-store";

/** Follows new transcript content only when pinned to the bottom, but always jumps on a brand-new turn. */
export function useStickyScroll(turns: ReadonlyArray<AskTurn>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const prevLenRef = useRef(0);

  /** Streaming updates must not yank the user away while they're scrolled up reading earlier turns. */
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

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
